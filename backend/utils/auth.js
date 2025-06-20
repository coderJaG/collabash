const jwt = require('jsonwebtoken');
const { jwtConfig } = require('../config');
const { User } = require('../db/models');
const { ROLE_PERMISSIONS } = require('./roles')
// const { Model } = require('sequelize'); // Model import is not used

const { secret, expiresIn } = jwtConfig;

//Sends JWT Cookie
const setTokenCookie = (res, user) => {
    //Create the token
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

    //set the token cookie
    res.cookie('token', token, {
        maxAge: expiresIn * 1000, // maxAge in milliseconds
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
            req.user = await User.findByPk(id, {
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
    if (!req.user) {
      const err = new Error('Authentication required');
      err.title = 'Authentication required';
      err.errors = { message: 'Authentication required' };
      err.status = 401;
      return next(err);
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    
    if (userPermissions.includes(permission)) {
      return next(); // User has the permission, proceed
    } else {
      const err = new Error('Forbidden');
      err.title = 'Forbidden';
      err.errors = { message: 'You do not have permission to perform this action.' };
      err.status = 403;
      return next(err);
    }
  };
};


module.exports = { setTokenCookie, restoreUser, requireAuth, requirePermission };
