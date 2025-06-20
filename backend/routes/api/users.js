//routes//api/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { check, body } = require('express-validator');
const { Sequelize, sequelize } = require('../../db/models'); // Import sequelize for transactions
const { setTokenCookie, requireAuth, requirePermission } = require('../../utils/auth');
const { PERMISSIONS, ROLE_PERMISSIONS } = require('../../utils/roles');
const { User, Pot, PotsUser } = require('../../db/models');
const { handleValidationErrors } = require('../../utils/validation');
const { logHistory } = require('../../utils/historyLogger'); // Import the logger

const router = express.Router();

// --- Validation Middlewares (unchanged) ---
// validate signup inputs
const validateSignupInputs = [
    check('firstName').exists({ checkFalsy: true }).withMessage('Please enter a first name'),
    check('lastName').exists({ checkFalsy: true }).withMessage('Please enter a last name'),
    check('mobile').exists({ checkFalsy: true }).withMessage('Please enter a mobile number')
        .custom(async (value, { req }) => {
            if (req.method === 'POST') {
                const existingUser = await User.findOne({ where: { mobile: value } });
                if (existingUser) throw new Error('Mobile number is already in use.');
            }
            return true;
        }),
    check('email').exists({ checkFalsy: true }).isEmail().withMessage('Please enter a valid email')
        .custom(async (value, { req }) => {
            if (req.method === 'POST') {
                const existingUser = await User.findOne({ where: { email: value } });
                if (existingUser) throw new Error('Email is already in use.');
            }
            return true;
        }),
    check('username').exists({ checkFalsy: true }).isLength({ min: 4 }).withMessage('Please provide a username with at least 4 characters.')
        .not().isEmail().withMessage('Username cannot be an email.')
        .custom(async (value, { req }) => {
            if (req.method === 'POST') {
                const existingUser = await User.findOne({ where: { username: value } });
                if (existingUser) throw new Error('Username is already in use.');
            }
            return true;
        }),
    check('password').exists({ checkFalsy: true }).isLength({ min: 6 }).withMessage('Password must be 6 characters or more.'),
    handleValidationErrors
];

// Validate user update inputs
const validateUserUpdate = [
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty if provided.'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty if provided.'),
    body('mobile').optional().notEmpty().withMessage('Mobile number cannot be empty if provided.')
        .custom(async (value, { req }) => {
            if (value) {
                const targetUserId = parseInt(req.params.userId, 10);
                const userToUpdate = await User.findByPk(targetUserId);
                if (userToUpdate && userToUpdate.mobile !== value) {
                    const existingUser = await User.findOne({ where: { mobile: value } });
                    if (existingUser && existingUser.id !== targetUserId) throw new Error('Mobile number is already in use by another account.');
                }
            }
            return true;
        }),
    body('email').optional().isEmail().withMessage('Please provide a valid email if you are changing it.')
        .custom(async (value, { req }) => {
            if (value) {
                const targetUserId = parseInt(req.params.userId, 10);
                const userToUpdate = await User.findByPk(targetUserId);
                if (userToUpdate && userToUpdate.email !== value) {
                    const existingUser = await User.findOne({ where: { email: value } });
                    if (existingUser && existingUser.id !== targetUserId) throw new Error('Email is already in use by another account.');
                }
            }
            return true;
        }),
    body('username').optional().isLength({ min: 4 }).withMessage('Username must be at least 4 characters if provided.')
        .not().isEmail().withMessage('Username cannot be an email.')
        .custom(async (value, { req }) => {
            if (value) {
                const targetUserId = parseInt(req.params.userId, 10);
                const userToUpdate = await User.findByPk(targetUserId);
                if (userToUpdate && userToUpdate.username !== value) {
                    const existingUser = await User.findOne({ where: { username: value } });
                    if (existingUser && existingUser.id !== targetUserId) throw new Error('Username is already in use by another account.');
                }
            }
            return true;
        }),
    body('password').optional({ checkFalsy: false }).if(body('password').exists({ checkFalsy: false }).notEmpty())
        .isLength({ min: 6 }).withMessage('New password must be 6 characters or more.'),
    body('role').optional()
        .custom((value, { req }) => {
            if (value && req.user.role !== 'banker') throw new Error('You are not authorized to change user roles.');
            if (value && !['standard', 'banker'].includes(value)) throw new Error('Invalid role specified.');
            return true;
        }),
    handleValidationErrors
];


// --- Read-Only Routes (unchanged) ---
// GET all users
router.get('/', requireAuth, async (req, res) => {
    const currUser = req.user;
    let usersToReturn = [];

    const includePotsJoinedWithUsers = {
        model: Pot,
        as: 'PotsJoined',
        attributes: ['id', 'name'],
        through: { attributes: [] }
    };

    try {
        // A banker or super admin can see everyone
        if ((ROLE_PERMISSIONS[currUser.role] || []).includes(PERMISSIONS.VIEW_ALL_USERS)) {
            usersToReturn = await User.findAll({
                attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'mobile', 'role'],
                include: [includePotsJoinedWithUsers]
            });
        } 
        // A standard user sees only users they share a pot with
        else if (currUser.role === 'standard') {
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
                // If they are in no pots, they only see themselves
                const selfUser = await User.findByPk(currUser.id, {
                    attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'mobile', 'role'],
                    include: [includePotsJoinedWithUsers]
                });
                if (selfUser) usersToReturn = [selfUser];
            }
        } else {
            // Fallback for any other case or unhandled role
             return res.status(403).json({ "message": "Forbidden: You do not have permission to view users." });
        }

        const usersData = usersToReturn.map(user => user.toJSON ? user.toJSON() : user);
        return res.json({ Users: usersData });

    } catch (error) {
        console.error("Error fetching all users:", error);
        return res.status(500).json({ message: "Internal server error while fetching users." });
    }
});

// GET user by ID
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
    const t = await sequelize.transaction();
    try {
        const hashedPassword = bcrypt.hashSync(password);
        const newUser = await User.create({
            firstName, lastName, mobile, email, drawDate, username, hashedPassword,
            role: (meta_createdByBanker && req.user?.role === 'banker' && role) ? role : 'standard'
        }, { transaction: t });

        const safeUser = { id: newUser.id, firstName: newUser.firstName, lastName: newUser.lastName, mobile: newUser.mobile, email: newUser.email, username: newUser.username, role: newUser.role };

        const description = req.user?.role === 'banker' && meta_createdByBanker
            ? `Banker ${req.user.username} (ID: ${req.user.id}) created new user ${newUser.username} (ID: ${newUser.id}).`
            : `New user ${newUser.username} (ID: ${newUser.id}) signed up.`;

        await logHistory({
            userId: req.user?.id || newUser.id, // User performing action, or self if signing up
            actionType: 'CREATE_USER',
            entityType: 'User',
            entityId: newUser.id,
            changes: { newUser: safeUser },
            description: description,
            transaction: t
        });

        if (!meta_createdByBanker) {
            await setTokenCookie(res, safeUser);
        }

        await t.commit();
        return res.status(201).json({ user: safeUser });

    } catch (error) {
        await t.rollback();
        console.error("Error signing up user:", error);
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = {};
            if (Array.isArray(error.errors)) {
                error.errors.forEach(e => errors[e.path || 'general'] = e.message);
            } else if (typeof error.errors === 'object' && error.errors !== null) {
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

    const hasPermissionToEditAny = (ROLE_PERMISSIONS[currUser.role] || []).includes(PERMISSIONS.EDIT_ANY_USER);
    if (currUser.id !== targetUserId && !hasPermissionToEditAny) {
        return res.status(403).json({ "message": "Forbidden: You are not authorized to edit this user." });
    }

    const t = await sequelize.transaction();
    try {
        const userToUpdate = await User.scope(null).findByPk(targetUserId, { transaction: t });
        if (!userToUpdate) {
            await t.rollback();
            return res.status(404).json({ "message": "User not found" });
        }

        const oldValues = { ...userToUpdate.get({ plain: true }) };
        const { firstName, lastName, mobile, drawDate, email, username, password, role } = req.body;
        const appliedChanges = {};

        // Update fields and track changes
        if (firstName !== undefined && firstName !== oldValues.firstName) { userToUpdate.firstName = firstName; appliedChanges.firstName = { old: oldValues.firstName, new: firstName }; }
        if (lastName !== undefined && lastName !== oldValues.lastName) { userToUpdate.lastName = lastName; appliedChanges.lastName = { old: oldValues.lastName, new: lastName }; }
        if (mobile !== undefined && mobile !== oldValues.mobile) { userToUpdate.mobile = mobile; appliedChanges.mobile = { old: oldValues.mobile, new: mobile }; }
        if (drawDate !== undefined && drawDate !== oldValues.drawDate) { userToUpdate.drawDate = drawDate; appliedChanges.drawDate = { old: oldValues.drawDate, new: drawDate }; }
        if (email !== undefined && email !== oldValues.email) { userToUpdate.email = email; appliedChanges.email = { old: oldValues.email, new: email }; }
        if (username !== undefined && username !== oldValues.username) { userToUpdate.username = username; appliedChanges.username = { old: oldValues.username, new: username }; }
        if (password && password.trim() !== "") { userToUpdate.hashedPassword = bcrypt.hashSync(password); appliedChanges.password = "Changed"; }
        if (currUser.role === 'banker' && role !== undefined && role !== oldValues.role) { userToUpdate.role = role; appliedChanges.role = { old: oldValues.role, new: role }; }

        if (Object.keys(appliedChanges).length > 0) {
            await userToUpdate.save({ transaction: t });

            await logHistory({
                userId: currUser.id,
                actionType: 'UPDATE_USER',
                entityType: 'User',
                entityId: targetUserId,
                changes: appliedChanges,
                description: `User ${currUser.username} (ID: ${currUser.id}) updated details for user ${userToUpdate.username} (ID: ${targetUserId}).`,
                transaction: t
            });
        }

        const safeUserResponse = { id: userToUpdate.id, firstName: userToUpdate.firstName, lastName: userToUpdate.lastName, mobile: userToUpdate.mobile, email: userToUpdate.email, username: userToUpdate.username, role: userToUpdate.role };

        if (currUser.id === targetUserId) {
            await setTokenCookie(res, safeUserResponse);
        }

        await t.commit();
        return res.json({ user: safeUserResponse });

    } catch (error) {
        await t.rollback();
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

    const canDeleteSelf = currUser.id === targetUserId && (ROLE_PERMISSIONS[currUser.role] || []).includes(PERMISSIONS.DELETE_OWN_ACCOUNT);
    const canDeleteAny = (ROLE_PERMISSIONS[currUser.role] || []).includes(PERMISSIONS.DELETE_ANY_USER);
    
    // Authorization check
    if (!canDeleteSelf && !canDeleteAny) {
        return res.status(403).json({ 'message': 'Forbidden: You do not have permission to delete this user.' });
    }
    // Prevent super admin from deleting themselves through this route if that's a desired rule
    if (canDeleteAny && currUser.id === targetUserId) {
        return res.status(400).json({ 'message': 'Admins cannot delete their own account from this panel.' });
    }

    const t = await sequelize.transaction();
    try {
        const userToDelete = await User.findByPk(targetUserId, { transaction: t });
        if (!userToDelete) {
            await t.rollback();
            return res.status(404).json({ 'message': 'User not found!' });
        }

        const userPots = await PotsUser.findOne({ where: { userId: targetUserId }, transaction: t });
        if (userPots) {
            await t.rollback();
            return res.status(400).json({ message: "Cannot delete user. They are still a member of one or more pots." });
        }

        const deletedUserInfo = { id: userToDelete.id, username: userToDelete.username, email: userToDelete.email, role: userToDelete.role };
        await userToDelete.destroy({ transaction: t });

        await logHistory({
            userId: currUser.id,
            actionType: 'DELETE_USER',
            entityType: 'User',
            entityId: targetUserId,
            changes: { deletedUser: deletedUserInfo },
            description: `User ${currUser.username} deleted user ${deletedUserInfo.username} (ID: ${targetUserId}).`,
            transaction: t
        });

        if (currUser.id === targetUserId) {
            res.clearCookie('token');
        }

        await t.commit();
        return res.json({ 'message': 'User Successfully Deleted' });
    } catch (error) {
        await t.rollback();
        console.error(`Error deleting user ${targetUserId}:`, error);
        return res.status(500).json({ message: "Internal server error while deleting user." });
    }
});


module.exports = router;