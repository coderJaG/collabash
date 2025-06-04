//routes//api/users.js

const express = require('express');
const bcrypt = require('bcryptjs');
const { check, body } = require('express-validator');
const { Sequelize } = require('sequelize');

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { User, Pot, PotsUser } = require('../../db/models');
const { handleValidationErrors } = require('../../utils/validation');

const router = express.Router();

//validate signup inputs 
const validateSignupInputs = [
    check('firstName')
        .exists({ checkFalsy: true })
        .withMessage('Please enter a first name'),
    check('lastName')
        .exists({ checkFalsy: true })
        .withMessage('Please enter a last name'),
    check('mobile')
        .exists({ checkFalsy: true })
        .withMessage('Please enter a mobile number')
        .custom(async (value, { req }) => { // Check for uniqueness on new user creation
            if (req.method === 'POST') { // Only for signup
                const existingUser = await User.findOne({ where: { mobile: value } });
                if (existingUser) {
                    throw new Error('Mobile number is already in use.');
                }
            }
            return true;
        }),
    check('email')
        .exists({ checkFalsy: true })
        .isEmail()
        .withMessage('Please enter a valid email')
        .custom(async (value, { req }) => { // Check for uniqueness on new user creation
            if (req.method === 'POST') { // Only for signup
                const existingUser = await User.findOne({ where: { email: value } });
                if (existingUser) {
                    throw new Error('Email is already in use.');
                }
            }
            return true;
        }),
    check('username')
        .exists({ checkFalsy: true })
        .isLength({ min: 4 })
        .withMessage('Please provide a username with at least 4 characters.')
        .not()
        .isEmail()
        .withMessage('Username cannot be an email.')
        .custom(async (value, { req }) => { // Check for uniqueness on new user creation
            if (req.method === 'POST') { // Only for signup
                const existingUser = await User.findOne({ where: { username: value } });
                if (existingUser) {
                    throw new Error('Username is already in use.');
                }
            }
            return true;
        }),
    check('password')
        .exists({ checkFalsy: true })
        .isLength({ min: 6 })
        .withMessage('Password must be 6 characters or more.'),
    handleValidationErrors
];

// Validate user update inputs
// This validation is used for the PUT /:userId endpoint
const validateUserUpdate = [
    // Optional: Validate firstName if provided
    body('firstName')
        .optional()
        .notEmpty()
        .withMessage('First name cannot be empty if provided.'),
    // Optional: Validate lastName if provided
    body('lastName')
        .optional()
        .notEmpty()
        .withMessage('Last name cannot be empty if provided.'),
    // Optional: Validate mobile if provided
    // Note: Mobile number format validation is commented out, as it's handled at the model level
    body('mobile')
        .optional()
        .notEmpty().withMessage('Mobile number cannot be empty if provided.')
        // .matches(/^\d{3}-\d{3}-\d{4}$/).withMessage('Mobile number must be in the format 999-999-9999.')
        .custom(async (value, { req }) => {
            if (value) { // Only check for uniqueness if mobile is provided and different from current user's
                const targetUserId = parseInt(req.params.userId, 10);
                const userToUpdate = await User.findByPk(targetUserId);
                if (userToUpdate && userToUpdate.mobile !== value) {
                    const existingUser = await User.findOne({ where: { mobile: value } });
                    if (existingUser && existingUser.id !== targetUserId) {
                        throw new Error('Mobile number is already in use by another account.');
                    }
                }
            }
            return true;
        }),
    // Optional: Validate email if provided
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email if you are changing it.')
        .custom(async (value, { req }) => {
            if (value) { // Only check for uniqueness if email is provided and different
                const targetUserId = parseInt(req.params.userId, 10);
                const userToUpdate = await User.findByPk(targetUserId);
                if (userToUpdate && userToUpdate.email !== value) {
                    const existingUser = await User.findOne({ where: { email: value } });
                    if (existingUser && existingUser.id !== targetUserId) {
                        throw new Error('Email is already in use by another account.');
                    }
                }
            }
            return true;
        }),
    // Optional: Validate username if provided
    body('username')
        .optional()
        .isLength({ min: 4 })
        .withMessage('Username must be at least 4 characters if provided.')
        .not()
        .isEmail()
        .withMessage('Username cannot be an email.')
        .custom(async (value, { req }) => {
            if (value) { // Only check for uniqueness if username is provided and different
                const targetUserId = parseInt(req.params.userId, 10);
                const userToUpdate = await User.findByPk(targetUserId);
                if (userToUpdate && userToUpdate.username !== value) {
                    const existingUser = await User.findOne({ where: { username: value } });
                    if (existingUser && existingUser.id !== targetUserId) {
                        throw new Error('Username is already in use by another account.');
                    }
                }
            }
            return true;
        }),
    // Optional: Validate password if provided
    body('password')
        .optional({ checkFalsy: false })
        .if(body('password').exists({ checkFalsy: false }).notEmpty()) // Only validate if password is provided and not empty
        .isLength({ min: 6 })
        .withMessage('New password must be 6 characters or more.'),
    // Role validation: only a banker can change a role
    body('role')
        .optional()
        .custom((value, { req }) => {
            if (value && req.user.role !== 'banker') {
                throw new Error('You are not authorized to change user roles.');
            }
            if (value && !['standard', 'banker'].includes(value)) { // Example roles
                throw new Error('Invalid role specified.');
            }
            return true;
        }),
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
            // error.errors might not always be an array, could be an object in some cases or from custom validations.
            // Safely iterate or access properties.
            if (Array.isArray(error.errors)) {
                error.errors.forEach(e => errors[e.path || 'general'] = e.message);
            } else if (typeof error.errors === 'object' && error.errors !== null) {
                // Handle cases where error.errors is an object (e.g. from custom unique checks)
                for (const key in error.errors) {
                    errors[key] = error.errors[key].message || error.errors[key];
                }
            } else {
                errors.general = error.message || "Validation error occurred.";
            }
            return res.status(400).json({ message: "Validation failed", errors });
        }
        return res.status(500).json({ message: error.message || "Internal server error during signup." });
    }
});

// Edit a user endpoint
router.put('/:userId', requireAuth, validateUserUpdate, async (req, res) => {
    const currUser = req.user;
    const targetUserId = parseInt(req.params.userId, 10);

    if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "Invalid user ID format." });
    }

    // Banker can edit anyone, standard user can only edit themselves.
    if (currUser.role !== 'banker' && currUser.id !== targetUserId) {
        return res.status(403).json({ "message": "Forbidden: You are not authorized to edit this user." });
    }
    try {
        const userToUpdate = await User.scope(null).findByPk(targetUserId);
        if (!userToUpdate) {
            return res.status(404).json({ "message": "User not found" });
        }

        const { firstName, lastName, mobile, drawDate, email, username, password, role } = req.body;

        // Update fields if they are provided in the request body
        if (firstName !== undefined) userToUpdate.firstName = firstName;
        if (lastName !== undefined) userToUpdate.lastName = lastName;
        if (mobile !== undefined) userToUpdate.mobile = mobile;
        if (drawDate !== undefined) userToUpdate.drawDate = drawDate; 
        if (email !== undefined) userToUpdate.email = email;
        if (username !== undefined) userToUpdate.username = username;

        // hash and update password if a new password is provided and is not an empty string
        if (password && password.trim() !== "") {
            userToUpdate.hashedPassword = bcrypt.hashSync(password);
        }

        // Only allow role changes if the current user is a banker and role is provided
        if (currUser.role === 'banker' && role !== undefined) {
            userToUpdate.role = role;
        } else if (role !== undefined && currUser.role !== 'banker') {
            return res.status(403).json({ message: "You are not authorized to change user roles." });

        }


        await userToUpdate.save();

        // Fetch the updated user again, but using the default scope to exclude sensitive info for the response
        const updatedSafeUserFromDB = await User.findByPk(userToUpdate.id); // Default scope applied


        // If default scope doesn't exclude everything needed, manually build it
        const safeUserResponse = {
            id: updatedSafeUserFromDB.id,
            firstName: updatedSafeUserFromDB.firstName,
            lastName: updatedSafeUserFromDB.lastName,
            mobile: updatedSafeUserFromDB.mobile,
            email: updatedSafeUserFromDB.email, // check if email is in default scope
            username: updatedSafeUserFromDB.username, // check if username is in default scope
            role: updatedSafeUserFromDB.role
        };
        // Manually ensure email and username are included if not by default scope for this response
        if (!safeUserResponse.email) safeUserResponse.email = updatedSafeUserFromDB.email;
        if (!safeUserResponse.username) safeUserResponse.username = updatedSafeUserFromDB.username;



        if (currUser.id === targetUserId) {
            await setTokenCookie(res, safeUserResponse); // Pass the safe user object to setTokenCookie
        }
        return res.json({ user: safeUserResponse });
    } catch (error) {
        console.error(`Error updating user ${targetUserId}:`, error);
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = {};
            if (Array.isArray(error.errors)) {
                error.errors.forEach(e => errors[e.path || 'general'] = e.message);
            } else if (typeof error.errors === 'object' && error.errors !== null) {
                for (const key in error.errors) {
                    errors[key] = error.errors[key].message || error.errors[key];
                }
            } else {
                errors.general = error.message || "Validation error occurred during update.";
            }
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

    // Banker can delete anyone, standard user can only delete themselves.
    if (currUser.role !== 'banker' && currUser.id !== targetUserId) {
        return res.status(403).json({ 'message': 'Forbidden: You are not authorized to delete this user.' });
    }
    try {
        const userToDelete = await User.findByPk(targetUserId);
        if (!userToDelete) {
            return res.status(404).json({ 'message': 'User not found!' });
        }
        await userToDelete.destroy();

        // If the deleted user is the one who made the request, clear their token
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
