const jwt = require('jsonwebtoken');
const { jwtConfig } = require('../config');
const { User } = require('../db/models');
const { ROLE_PERMISSIONS } = require('./roles')

const { secret, expiresIn } = jwtConfig;

//Sends JWT Cookie
const setTokenCookie = (res, user) => {
    const safeUserForToken = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        mobile: user.mobile,
        role: user.role
    };
    const token = jwt.sign(
        { data: safeUserForToken },
        secret,
        { expiresIn: parseInt(expiresIn) }
    );

    const isProduction = process.env.NODE_ENV === 'production';

   
    res.cookie('token', token, {
        maxAge: expiresIn * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction && 'Lax'
    });

    return token;
};

const restoreUser = (req, res, next) => {
    const { token } = req.cookies;
    req.user = null;

    return jwt.verify(token, secret, null, async (err, jwtPayload) => {
        if (err) {
            // If token is invalid (e.g., expired, malformed), clear it and proceed
            // console.warn("JWT verification error:", err.name); // Optional: log specific JWT errors
            // if (err.name === 'TokenExpiredError') res.clearCookie('token'); // Example for expired token
            return next();
        }

        try {
            const { id } = jwtPayload.data;
            const userInstance = await User.findByPk(id, {
                attributes: [
                    'id',
                    'firstName',
                    'lastName',
                    'email',
                    'username',
                    'mobile',
                    'role'
                ]
            });
            
            // FIX: Convert Sequelize instance to plain object
            if (userInstance) {
                req.user = userInstance.toJSON();
                // Add permissions to the user object
                const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
                req.user.permissions = userPermissions;
            }
        } catch (e) {
            console.error("Error restoring user from DB:", e);
            res.clearCookie('token');
            return next();
        }

        if (!req.user) {
            res.clearCookie('token');
        }
        return next();
    });
};

const requireAuth = (req, _res, next) => {
    if (req.user) return next();

    const err = new Error('Authentication required');
    err.title = 'Authentication required';
    err.errors = { message: 'Authentication required' };
    err.status = 401;
    return next(err);
};

const requirePermission = (permission) => {
    return (req, res, next) => {
        if (req.user) {
            if (req.user.role === 'suspended') {
                res.clearCookie('token');
                const err = new Error('Authentication required');
                err.title = 'Authentication required';
                err.errors = { message: 'Your session is invalid as your account has been suspended.' };
                err.status = 401;
                return next(err);
            }
            
            // Check if user has the required permission
            const userPermissions = req.user.permissions || ROLE_PERMISSIONS[req.user.role] || [];
            if (!userPermissions.includes(permission)) {
                const err = new Error('Forbidden');
                err.title = 'Forbidden';
                err.errors = { message: 'You do not have permission to perform this action.' };
                err.status = 403;
                return next(err);
            }
            
            return next();
        }

        const err = new Error('Authentication required');
        err.title = 'Authentication required';
        err.errors = { message: 'Authentication required' };
        err.status = 401;
        return next(err);
    };
};

module.exports = { setTokenCookie, restoreUser, requireAuth, requirePermission };