const express = require('express');
const bcrypt = require('bcryptjs');
const { check } = require('express-validator');
const Sequelize = require('sequelize');

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { User, Pot, PotsUser } = require('../../db/models');
const { handleValidationErrors } = require('../../utils/validation');

const router = express.Router();

//validate singup inputs
const validateSignupInputs = [
    check('firstName')
        .exists({ checkFalsy: true })
        .withMessage('Please enter a first name'),
    check('lastName')
        .exists({ checkFalsy: true })
        .withMessage('Please enter a last name'),
    check('mobile')
        .exists({ checkFalsy: true })
        .withMessage('Please enter a mobile number'),
    check('email')
        .exists({ checkFalsy: true })
        .isEmail()
        .withMessage('Please enter a valid email'),
    check('username')
        .exists({ checkFalsy: true })
        .isLength({ min: 4 })
        .withMessage('Please provide a username with at least 4 characters.'),
    check('username')
        .not()
        .isEmail()
        .withMessage('Username cannot be an email.'),
    check('password')
        .exists({ checkFalsy: true })
        .isLength({ min: 6 })
        .withMessage('Password must be 6 characters or more.'),
    handleValidationErrors
]



//get all users endpoint
router.get('/', requireAuth, async (req, res) => {
    const currUser = req.user; 
    let usersToReturn = [];

    try {
        if (currUser.role === 'banker') {
            usersToReturn = await User.findAll({
                // Bankers see all users, defaultScope will apply (excluding sensitive fields)
                // If you need PotsJoined for each user for bankers:
                include: [{ model: Pot, as: 'PotsJoined', attributes: ['id', 'name'], through: { attributes: [] } }]
            });
        } else if (currUser.role === 'standard') {
            // 1. Find all pot IDs the current user is part of.
            const userPots = await PotsUser.findAll({
                where: { userId: currUser.id },
                attributes: ['potId']
            });
            const potIds = userPots.map(up => up.potId);
            if (potIds.length > 0) {
                // 2. Find all user IDs that are part of these pots.
                const potUserEntries = await PotsUser.findAll({
                    where: { potId: potIds },
                    attributes: [
                        // Use Sequelize.fn and Sequelize.col for distinct userId
                        [Sequelize.fn('DISTINCT', Sequelize.col('userId')), 'userId']
                    ]
                });
                const sharedUserIds = potUserEntries.map(pu => pu.userId);
    
                // 3. Fetch these users 
                // Ensure current user is included even if they have no pots yet but are trying to see "all" users
                if (!sharedUserIds.includes(currUser.id)) {
                    sharedUserIds.push(currUser.id);
                }
                usersToReturn = await User.findAll({ where: { id: sharedUserIds },
                    include: [{ model: Pot, as: 'PotsJoined', attributes: ['id', 'name'], through: { attributes: [] } }]
                 });

            } else {
                // If standard user is in no pots, they only see themselves
                usersToReturn = [currUser]; 
                const selfUser = await User.findByPk(currUser.id);
                if (selfUser) usersToReturn = [selfUser];
            }
        } else {
            return res.status(403).json({ "message": "Forbidden: Role not authorized." });
        }

        // Convert to JSON format, ensuring to handle any custom toJSON methods
        const usersData = usersToReturn.map(user => user.toJSON ? user.toJSON() : user);


        return res.json({ Users: usersData });

    } catch (error) {
        console.error("Error fetching all users:", error);
        return res.status(500).json({ message: "Internal server error while fetching users." });
    }
});


// Get user by id endpoint
router.get('/:userId', requireAuth, async (req, res) => {
    const targetUserId = parseInt(req.params.userId, 10);
    const currUser = req.user;
    let targetUser;

    if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "Invalid user ID format." });
    }

    try {
        if (currUser.role === 'banker') {
            targetUser = await User.findByPk(targetUserId, {
                include: [{
                    model: Pot,
                    as: 'PotsJoined', // Alias from User model
                    attributes: ['id', 'name', 'amount'],
                    through: { attributes: [] }
                }]
            });
        } else if (currUser.role === 'standard') {
            if (currUser.id === targetUserId) { // Standard user viewing their own profile
                targetUser = await User.findByPk(targetUserId, { // Fetch with associations
                    include: [{
                        model: Pot,
                        as: 'PotsJoined',
                        attributes: ['id', 'name', 'amount'],
                        through: { attributes: [] }
                    }]
                });
            } else { // Standard user viewing another user's profile
                // Check if they share a pot
                const currentUserPots = await PotsUser.findAll({
                    where: { userId: currUser.id },
                    attributes: ['potId']
                });
                const currentUserPotIds = currentUserPots.map(p => p.potId);

                if (currentUserPotIds.length > 0) {
                    const targetUserSharedPot = await PotsUser.findOne({
                        where: {
                            userId: targetUserId,
                            potId: currentUserPotIds // Check if target user is in any of current user's pots
                        }
                    });
                    if (targetUserSharedPot) {
                        targetUser = await User.findByPk(targetUserId, {});
                         // If I want to show common pots:
                        // targetUser = await User.findByPk(targetUserId, {
                        //     include: [{
                        //         model: Pot,
                        //         as: 'PotsJoined',
                        //         where: { id: currentUserPotIds }, // Only common pots
                        //         attributes: ['id', 'name', 'amount'],
                        //         through: { attributes: [] },
                        //         required: false // So user is returned even if no common pots (but auth failed earlier)
                        //     }]
                        // });
                    }
                }
                if (!targetUser) { // If no shared pot or other condition fails
                    return res.status(403).json({ "message": "Forbidden: You can only view users you share a pot with." });
                }
            }
        } else {
            return res.status(403).json({ "message": "Forbidden: Role not authorized." });
        }

        if (!targetUser) {
            return res.status(404).json({ "message": "User couldn't be found" });
        }

        return res.json(targetUser.toJSON ? targetUser.toJSON() : targetUser);

    } catch (error) {
        console.error(`Error fetching user ${targetUserId}:`, error);
        return res.status(500).json({ message: "Internal server error while fetching user details." });
    }
});


// Sign up a user endpoint
router.post('/', validateSignupInputs, async (req, res) => {
    const { firstName, lastName, mobile, email, drawDate, username, password, role, meta_createdByBanker } = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password);
        const newUser = await User.create({
            firstName,
            lastName,
            mobile,
            email,
            drawDate,
            username,
            hashedPassword,
            // Banker can set role; otherwise, it defaults to 'standard'.
            // Also, ensure the current authenticated user (if any, for this public route) is a banker if setting role.
            // For a truly public signup, 'role' might not be accepted from the body.
            // If a banker is creating, they are authenticated, and req.user would exist.
            role: (meta_createdByBanker && req.user?.role === 'banker' && role) ? role : 'standard'
        });

        const safeUser = { 
            id: newUser.id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            mobile: newUser.mobile,
            email: newUser.email,
            username: newUser.username,
            role: newUser.role
        };

        // Only set token cookie if it's a self-signup (not created by banker)
        if (!meta_createdByBanker) {
            await setTokenCookie(res, safeUser);
        }

        return res.status(201).json({ user: safeUser });

    } catch (error) {
        console.error("Error signing up user:", error);
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = {};
            error.errors.forEach(e => errors[e.path || 'general'] = e.message);
            return res.status(400).json({ message: "Validation failed", errors });
        }
        return res.status(500).json({ message: error.message || "Internal server error during signup." });
    }
});

// Edit a user endpoint
router.put('/:userId', requireAuth, validateSignupInputs, async (req, res) => {
    const currUser = req.user;
    const targetUserId = parseInt(req.params.userId, 10);

    if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "Invalid user ID format." });
    }

    // Authorization: Banker can edit anyone. Standard user can only edit themselves.
    if (currUser.role !== 'banker' && currUser.id !== targetUserId) {
        return res.status(403).json({ "message": "Forbidden: You are not authorized to edit this user." });
    }

    try {
        const userToUpdate = await User.findByPk(targetUserId);
        if (!userToUpdate) {
            return res.status(404).json({ "message": "User not found" });
        }

        const { firstName, lastName, mobile, drawDate, email, username, password, role } = req.body;

        // Update fields
        userToUpdate.firstName = firstName || userToUpdate.firstName;
        userToUpdate.lastName = lastName || userToUpdate.lastName;
        userToUpdate.mobile = mobile || userToUpdate.mobile;
        userToUpdate.drawDate = drawDate === undefined ? userToUpdate.drawDate : drawDate; // Allow null for drawDate
        userToUpdate.email = email || userToUpdate.email;
        userToUpdate.username = username || userToUpdate.username;

        if (password) { // Only update password if a new one is provided
            userToUpdate.hashedPassword = bcrypt.hashSync(password);
        }

        // Only allow bankers to change roles, and only if 'role' is actually in the request body
        if (currUser.role === 'banker' && role !== undefined) {
            userToUpdate.role = role;
        }

        await userToUpdate.save();

        const safeUser = {
            id: userToUpdate.id,
            firstName: userToUpdate.firstName,
            lastName: userToUpdate.lastName,
            mobile: userToUpdate.mobile,
            email: userToUpdate.email,
            username: userToUpdate.username,
            role: userToUpdate.role
        };

        // If the user updated their own session, re-set the token cookie
        if (currUser.id === targetUserId) {
            await setTokenCookie(res, safeUser);
        }

        return res.json({ user: safeUser });

    } catch (error) {
        console.error(`Error updating user ${targetUserId}:`, error);
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = error.errors.map(e => e.message);
            return res.status(400).json({ message: "Validation error", errors });
        }
        return res.status(500).json({ message: "Internal server error while updating user." });
    }
});


// Delete a user by id
router.delete('/:userId', requireAuth, async (req, res) => {
    const currUser = req.user;
    const targetUserId = parseInt(req.params.userId, 10);

    if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "Invalid user ID format." });
    }

    // Authorization: Banker can delete anyone. Standard user can only delete themselves.
    if (currUser.role !== 'banker' && currUser.id !== targetUserId) {
        return res.status(403).json({ 'message': 'Forbidden: You are not authorized to delete this user.' });
    }

    try {
        const userToDelete = await User.findByPk(targetUserId);
        if (!userToDelete) {
            return res.status(404).json({ 'message': 'User not found!' });
        }

        await userToDelete.destroy();
        // If user deleted their own account, clear the cookie (handled by frontend usually, but can be done here too)
        if (currUser.id === targetUserId) {
            res.clearCookie('token');
        }
        return res.json({ 'message': 'User Successfully Deleted' });

    } catch (error) {
        console.error(`Error deleting user ${targetUserId}:`, error);
        return res.status(500).json({ message: "Internal server error while deleting user." });
    }
});

module.exports = router;