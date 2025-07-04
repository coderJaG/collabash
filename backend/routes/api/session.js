const express = require('express');
const bcrypt = require('bcryptjs');
const { check } = require('express-validator');
const { Op } = require('sequelize');
const { setTokenCookie } = require('../../utils/auth');
const { User } = require('../../db/models');
const { handleValidationErrors } = require('../../utils/validation');   
const { ROLE_PERMISSIONS } = require('../../utils/roles'); 

const router = express.Router();



// Get Current User route
router.get('/', (req, res) => {
    const { user } = req;
    if (user) {
        const userPermissions = ROLE_PERMISSIONS[user.role] || [];
        const userWithPermissions = {
            ...user,
            permissions: userPermissions
        };
        
        return res.json({
            user: userWithPermissions
        });
    } else return res.json({ user: null });
});



// Log in
router.post('/', async (req, res, next) => {
    const { credential, password } = req.body;

    const user = await User.unscoped().findOne({
        where: {
            [Op.or]: {
                username: credential,
                email: credential
            }
        }
    });

    // Check for user existence
    if (!user) {
        const err = new Error("Login failed");
        err.status = 401;
        err.title = "Login failed";
        err.errors = { message: "Invalid credentials" };
        return next(err);
    }

    // Check if the user's account is suspended
    if (user.role === 'suspended') {
        const err = new Error("Login failed");
        err.status = 403;
        err.title = "Account Suspended";
        err.errors = { message: "Your account has been suspended. Please contact support." };
        return next(err);
    }
    
    // Check password if not suspended
    if (!bcrypt.compareSync(password, user.hashedPassword.toString())) {
        const err = new Error("Login failed");
        err.status = 401;
        err.title = "Login failed";
        err.errors = { message: "Invalid credentials" };
        return next(err);
    }

    // After validating, get the user's permissions
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    
    const safeUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
        permissions: userPermissions,
    };

    await setTokenCookie(res, safeUser);

    return res.json({
        user: safeUser
    });
});

// Log out route
router.delete('/', (_req, res) => {
    res.clearCookie('token');
    return res.json({ message: 'success' });
});

// Get Current User route
router.get('/', (req, res) => {
    const { user } = req;
    if (user) {
        return res.json({
            user: user
        });
    } else return res.json({ user: null });
});


module.exports = router;