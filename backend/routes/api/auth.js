// routes/api/auth.js - Production version with database storage (DEBUGGED)
const express = require('express');
const bcrypt = require('bcryptjs');
const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');
const { User, PasswordResetToken } = require('../../db/models');
const { Op } = require('sequelize');
const crypto = require('crypto');

const router = express.Router();

// For production, replace these with actual services
const sendEmail = async (to, subject, text) => {
    // Debug logging
    console.log(`📧 EMAIL FUNCTION CALLED`);
    console.log(`📧 TO: ${to} (type: ${typeof to})`);
    console.log(`📧 SUBJECT: ${subject}`);
    console.log(`📧 CONTENT: ${text}`);
    
    // Integration examples:
    // - SendGrid: const sgMail = require('@sendgrid/mail');
    // - Nodemailer: const nodemailer = require('nodemailer');
    // - AWS SES: const AWS = require('aws-sdk');
    
    if (!to) {
        console.error('❌ EMAIL ERROR: No recipient provided');
        return Promise.reject(new Error('No email recipient provided'));
    }
    
    return Promise.resolve(true);
};

const sendSMS = async (to, message) => {
    // Debug logging
    console.log(`📱 SMS FUNCTION CALLED`);
    console.log(`📱 TO: ${to} (type: ${typeof to})`);
    console.log(`📱 MESSAGE: ${message}`);
    
    // Integration examples:
    // - Twilio: const twilio = require('twilio');
    // - AWS SNS: const AWS = require('aws-sdk');
    // - Nexmo: const Nexmo = require('nexmo');
    
    if (!to) {
        console.error('❌ SMS ERROR: No recipient provided');
        return Promise.reject(new Error('No SMS recipient provided'));
    }
    
    return Promise.resolve(true);
};

// Generate secure reset token
const generateResetToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Validation middleware with better error handling
const validateEmail = [
    check('email')
        .exists({ checkFalsy: true })
        .withMessage('Email is required.')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address.'),
    handleValidationErrors
];

const validateMobile = [
    check('mobile')
        .exists({ checkFalsy: true })
        .withMessage('Mobile number is required.')
        .isMobilePhone()
        .withMessage('Please provide a valid mobile number.'),
    handleValidationErrors
];

const validatePasswordReset = [
    check('token')
        .exists({ checkFalsy: true })
        .isLength({ min: 32, max: 128 })
        .withMessage('Invalid reset token format.'),
    check('password')
        .exists({ checkFalsy: true })
        .isLength({ min: 6 })
        .withMessage('Password must be 6 characters or more.'),
    handleValidationErrors
];

// Clean up expired tokens periodically (run this as a scheduled job in production)
const cleanupExpiredTokens = async () => {
    try {
        const deletedCount = await PasswordResetToken.cleanupExpired();
        if (deletedCount > 0) {
            console.log(`Cleaned up ${deletedCount} expired password reset tokens`);
        }
    } catch (error) {
        console.error('Error cleaning up expired tokens:', error);
    }
};

// Run cleanup every hour (in production, use a proper job scheduler)
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

// POST /api/auth/forgot-password - Send password reset email
router.post('/forgot-password', validateEmail, async (req, res) => {
    const { email } = req.body;

    console.log(`🔍 FORGOT PASSWORD REQUEST for email: ${email}`);

    try {
        // Find user by email with debug logging
        console.log(`🔍 Looking for user with email: ${email}`);
        const user = await User.scope(null).findOne({
            where: { email: email.toLowerCase() },
            attributes: ['id', 'firstName', 'lastName', 'email', 'mobile', 'role']
        });

        console.log(`🔍 User found:`, user ? `Yes (ID: ${user.id}, Email: ${user.email})` : 'No');

        // Always return success to prevent email enumeration attacks
        if (!user) {
            console.log(`⚠️ No user found for email: ${email}, but returning success`);
            return res.json({
                message: 'If an account with that email exists, we have sent password reset instructions.'
            });
        }

        // Invalidate any existing tokens for this user
        console.log(`🗑️ Invalidating existing tokens for user: ${user.id}`);
        await PasswordResetToken.invalidateUserTokens(user.id);

        // Generate new reset token
        const resetToken = generateResetToken();
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

        console.log(`🔑 Generated reset token: ${resetToken.substring(0, 8)}...`);

        // Store token in database
        await PasswordResetToken.create({
            userId: user.id,
            token: resetToken,
            expiresAt
        });

        console.log(`💾 Stored token in database for user: ${user.id}`);

        // Create reset URL (adjust domain for production)
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;

        // Email content
        const emailSubject = 'Password Reset Request';
        const emailText = `
Hello ${user.firstName},

You have requested to reset your password. Please click the link below to reset your password:

${resetUrl}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email and your password will remain unchanged.

For security reasons, please do not reply to this email.

Best regards,
Your App Team
        `;

        console.log(`📧 Preparing to send email to: ${user.email}`);

        // Send email with error handling
        try {
            await sendEmail(user.email, emailSubject, emailText);
            console.log(`✅ Email sent successfully to: ${user.email}`);
        } catch (emailError) {
            console.error(`❌ Failed to send email to ${user.email}:`, emailError);
            // Don't expose email sending errors to the user
        }

        res.json({
            message: 'If an account with that email exists, we have sent password reset instructions.'
        });

    } catch (error) {
        console.error('❌ Forgot password error:', error);
        res.status(500).json({
            message: 'An error occurred while processing your request. Please try again later.'
        });
    }
});

// POST /api/auth/forgot-username - Send username to mobile
router.post('/forgot-username', validateMobile, async (req, res) => {
    const { mobile } = req.body;

    console.log(`🔍 FORGOT USERNAME REQUEST for mobile: ${mobile}`);

    try {
        // Find user by mobile number
        console.log(`🔍 Looking for user with mobile: ${mobile}`);
        const user = await User.scope(null).findOne({
            where: { mobile },
            attributes: ['id', 'firstName', 'lastName', 'email', 'mobile', 'username', 'role']
        });

        console.log(`🔍 User found:`, user ? `Yes (ID: ${user.id}, Mobile: ${user.mobile})` : 'No');

        // Always return success to prevent phone number enumeration attacks
        if (!user) {
            console.log(`⚠️ No user found for mobile: ${mobile}, but returning success`);
            return res.json({
                message: 'If an account with that mobile number exists, we have sent the username.'
            });
        }

        // SMS content
        const smsMessage = `Hello ${user.firstName}, your username is: ${user.username}. If you did not request this, please contact support.`;

        console.log(`📱 Preparing to send SMS to: ${user.mobile}`);

        // Send SMS with error handling
        try {
            await sendSMS(user.mobile, smsMessage);
            console.log(`✅ SMS sent successfully to: ${user.mobile}`);
        } catch (smsError) {
            console.error(`❌ Failed to send SMS to ${user.mobile}:`, smsError);
            // Don't expose SMS sending errors to the user
        }

        res.json({
            message: 'If an account with that mobile number exists, we have sent the username.'
        });

    } catch (error) {
        console.error('❌ Forgot username error:', error);
        res.status(500).json({
            message: 'An error occurred while processing your request. Please try again later.'
        });
    }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', validatePasswordReset, async (req, res) => {
    const { token, password } = req.body;

    console.log(`🔍 RESET PASSWORD REQUEST with token: ${token ? token.substring(0, 8) + '...' : 'undefined'}`);

    try {
        // Find valid token
        console.log(`🔍 Looking for valid token in database`);
        const resetTokenRecord = await PasswordResetToken.findValidToken(token);
        
        if (!resetTokenRecord) {
            console.log(`❌ Invalid or expired token: ${token ? token.substring(0, 8) + '...' : 'undefined'}`);
            return res.status(400).json({
                message: 'Invalid or expired reset token.'
            });
        }

        const user = resetTokenRecord.User;
        
        if (!user) {
            console.log(`❌ No user found for valid token`);
            // Mark token as used even if user not found
            await resetTokenRecord.update({ used: true });
            return res.status(400).json({
                message: 'User not found.'
            });
        }

        console.log(`✅ Valid token found for user: ${user.id} (${user.email})`);

        // Hash the new password
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Update user's password
        await user.update({
            hashedPassword
        });

        console.log(`✅ Password updated for user: ${user.id}`);

        // Mark token as used
        await resetTokenRecord.update({ used: true });

        console.log(`🗑️ Token marked as used`);

        // Send confirmation email
        const confirmationSubject = 'Password Successfully Reset';
        const confirmationText = `
Hello ${user.firstName},

Your password has been successfully reset at ${new Date().toLocaleString()}.

If you did not make this change, please contact our support team immediately.

For your security:
- Never share your password with anyone
- Use a strong, unique password
- Consider enabling two-factor authentication

Best regards,
Your App Team
        `;

        try {
            await sendEmail(user.email, confirmationSubject, confirmationText);
            console.log(`✅ Confirmation email sent to: ${user.email}`);
        } catch (emailError) {
            console.error(`❌ Failed to send confirmation email:`, emailError);
            // Don't fail the password reset if confirmation email fails
        }

        res.json({
            message: 'Password successfully reset. You can now log in with your new password.'
        });

    } catch (error) {
        console.error('❌ Reset password error:', error);
        res.status(500).json({
            message: 'An error occurred while resetting your password. Please try again later.'
        });
    }
});

// GET /api/auth/verify-reset-token/:token - Verify if reset token is valid
router.get('/verify-reset-token/:token', async (req, res) => {
    const { token } = req.params;

    console.log(`🔍 VERIFY TOKEN REQUEST: ${token ? token.substring(0, 8) + '...' : 'undefined'}`);

    try {
        // Validate token format
        if (!token || token.length < 32) {
            console.log(`❌ Invalid token format: ${token}`);
            return res.status(400).json({
                valid: false,
                message: 'Invalid token format.'
            });
        }

        const resetTokenRecord = await PasswordResetToken.findValidToken(token);
        
        if (!resetTokenRecord) {
            console.log(`❌ Token not found or expired: ${token.substring(0, 8)}...`);
            return res.status(400).json({
                valid: false,
                message: 'Invalid or expired reset token.'
            });
        }

        console.log(`✅ Token is valid: ${token.substring(0, 8)}...`);

        res.json({
            valid: true,
            message: 'Token is valid.',
            expiresAt: resetTokenRecord.expiresAt
        });

    } catch (error) {
        console.error('❌ Token verification error:', error);
        res.status(500).json({
            valid: false,
            message: 'An error occurred while verifying the token.'
        });
    }
});

// GET /api/auth/cleanup-tokens - Manual cleanup endpoint (admin only in production)
router.get('/cleanup-tokens', async (req, res) => {
    try {
        const deletedCount = await PasswordResetToken.cleanupExpired();
        res.json({
            message: `Cleaned up ${deletedCount} expired tokens.`,
            deletedCount
        });
    } catch (error) {
        console.error('Manual cleanup error:', error);
        res.status(500).json({
            message: 'Error during token cleanup.'
        });
    }
});

module.exports = router;