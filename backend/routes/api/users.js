//routes//api/users.js

const express = require('express');
const bcrypt = require('bcryptjs');
const { check } = require('express-validator');
const { Sequelize } = require('sequelize'); 

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
        // .custom((value) => {
        //     if (value && !/^\d{3}-\d{3}-\d{4}$/.test(value) && !/^\d{10}$/.test(value)) {
        //         throw new Error('Mobile number must be in the format 999-999-9999 or be 10 digits.');
        //     }
        //     return true;
        // }), already validated in th model. for future changes.
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
];



//get all users endpoint
router.get('/', requireAuth, async (req, res) => {
    const currUser = req.user;
    let usersToReturn = [];

    const includePotsJoinedWithUsers = {
        model: Pot,
        as: 'PotsJoined',
        attributes: ['id', 'name', 'amount', 'ownerId'],
        through: { attributes: [] },
        include: [{
            model: User,
            as: 'Users',
            attributes: ['id'],
            through: { attributes: [] }
        }]
    };

    try {
        if (currUser.role === 'banker') {
            usersToReturn = await User.findAll({
                attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'mobile', 'role'],
                include: [includePotsJoinedWithUsers]
            });
        } else if (currUser.role === 'standard') {
            const userPots = await PotsUser.findAll({
                where: { userId: currUser.id },
                attributes: ['potId']
            });
            const potIds = userPots.map(up => up.potId);

            if (potIds.length > 0) {
                const potUserEntries = await PotsUser.findAll({
                    where: { potId: potIds },
                    attributes: [
                        [Sequelize.fn('DISTINCT', Sequelize.col('userId')), 'userId']
                    ]
                });
                let sharedUserIds = potUserEntries.map(pu => pu.userId);

                if (!sharedUserIds.includes(currUser.id)) {
                    sharedUserIds.push(currUser.id);
                }
                usersToReturn = await User.findAll({
                    where: { id: sharedUserIds },
                    attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'mobile', 'role'],
                    include: [includePotsJoinedWithUsers]
                });
            } else {
                const selfUser = await User.findByPk(currUser.id, {
                    attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'mobile', 'role'],
                    include: [includePotsJoinedWithUsers] 
                });
                if (selfUser) usersToReturn = [selfUser];
            }
        } else {
            return res.status(403).json({ "message": "Forbidden: Role not authorized." });
        }

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

    if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "Invalid user ID format." });
    }

    try {
        const userAttributes = ['id', 'firstName', 'lastName', 'email', 'username', 'mobile', 'role'];

        const targetUserInstance = await User.findByPk(targetUserId, {
            attributes: userAttributes
        });

        if (!targetUserInstance) {
            return res.status(404).json({ "message": "User couldn't be found" });
        }

        // Authorization check
        let isAuthorizedToView = false;
        if (currUser.role === 'banker' || currUser.id === targetUserId) {
            isAuthorizedToView = true;
        } else {
            const currentUserPots = await PotsUser.findAll({
                where: { userId: currUser.id },
                attributes: ['potId']
            });
            const currentUserPotIds = currentUserPots.map(p => p.potId);
            if (currentUserPotIds.length > 0) {
                const targetUserSharedPot = await PotsUser.findOne({
                    where: { userId: targetUserId, potId: currentUserPotIds }
                });
                if (targetUserSharedPot) isAuthorizedToView = true;
            }
        }
        if (!isAuthorizedToView) {
             return res.status(403).json({ "message": "Forbidden: You are not authorized to view this user's profile." });
        }

        // Fetch pots explicitly owned by the targetUser
        const potsOwned = await Pot.findAll({
            where: { ownerId: targetUserId },
            attributes: ['id', 'name', 'amount', 'ownerId'],
            include: [{
                model: User,
                as: 'Users',
                attributes: ['id'],
                through: { attributes: [] }
            }]
        });

        // Fetch all pots the targetUser is a member of (via PotsUser table)
       
        const userWithAllJoinedPots = await User.findByPk(targetUserId, {
            attributes: [], 
            include: [{
                model: Pot,
                as: 'PotsJoined', 
                attributes: ['id', 'name', 'amount', 'ownerId'],
                through: { attributes: [] },
                include: [{
                    model: User,
                    as: 'Users', 
                    attributes: ['id'],
                    through: { attributes: [] }
                }]
            }]
        });
        const allPotsUserIsMemberOf = userWithAllJoinedPots ? (userWithAllJoinedPots.PotsJoined || []) : [];

        const responseUser = targetUserInstance.toJSON();
        responseUser.PotsOwned = potsOwned.map(p => p.toJSON());
        responseUser.PotsJoined = allPotsUserIsMemberOf.map(p => p.toJSON()); 

        return res.json(responseUser);

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

    if (currUser.role !== 'banker' && currUser.id !== targetUserId) {
        return res.status(403).json({ "message": "Forbidden: You are not authorized to edit this user." });
    }
    try {
        const userToUpdate = await User.scope(null).findByPk(targetUserId);
        if (!userToUpdate) {
            return res.status(404).json({ "message": "User not found" });
        }

        const { firstName, lastName, mobile, drawDate, email, username, password, role } = req.body;

        if (firstName !== undefined) userToUpdate.firstName = firstName;
        if (lastName !== undefined) userToUpdate.lastName = lastName;
        if (mobile !== undefined) userToUpdate.mobile = mobile;
        if (drawDate !== undefined) userToUpdate.drawDate = drawDate;
        if (email !== undefined) userToUpdate.email = email;
        if (username !== undefined) userToUpdate.username = username;
        if (password) {
            userToUpdate.hashedPassword = bcrypt.hashSync(password);
        }
        if (currUser.role === 'banker' && role !== undefined) {
            userToUpdate.role = role;
        }

        await userToUpdate.save();
        const updatedSafeUserFromDB = await User.findByPk(userToUpdate.id, {
            attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'mobile', 'role']
        });
        const safeUserResponse = {
            id: updatedSafeUserFromDB.id,
            firstName: updatedSafeUserFromDB.firstName,
            lastName: updatedSafeUserFromDB.lastName,
            mobile: updatedSafeUserFromDB.mobile,
            email: updatedSafeUserFromDB.email,
            username: updatedSafeUserFromDB.username,
            role: updatedSafeUserFromDB.role
        };

        if (currUser.id === targetUserId) {
            await setTokenCookie(res, safeUserResponse);
        }
        return res.json({ user: safeUserResponse });
    } catch (error) {
        console.error(`Error updating user ${targetUserId}:`, error);
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = {};
            error.errors.forEach(e => errors[e.path || 'general'] = e.message);
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

    if (currUser.role !== 'banker' && currUser.id !== targetUserId) {
        return res.status(403).json({ 'message': 'Forbidden: You are not authorized to delete this user.' });
    }
    try {
        const userToDelete = await User.findByPk(targetUserId);
        if (!userToDelete) {
            return res.status(404).json({ 'message': 'User not found!' });
        }
        await userToDelete.destroy();
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
