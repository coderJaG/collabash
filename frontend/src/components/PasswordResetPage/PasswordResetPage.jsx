// PasswordResetPage.jsx - Standalone page for password reset
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { csrfFetch } from '../../store/csrf';
import { 
    MdLock, 
    MdVisibility, 
    MdVisibilityOff,
    MdCheckCircle,
    MdError,
    MdSave,
    MdArrowBack
} from 'react-icons/md';
import './PasswordResetPage.css';

function PasswordResetPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [focusedField, setFocusedField] = useState('');

    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setIsVerifying(false);
            setErrors({ token: 'No reset token provided.' });
            return;
        }

        verifyToken();
    }, [token]);

    const verifyToken = async () => {
        try {
            const response = await csrfFetch(`/api/auth/verify-reset-token/${token}`);
            const data = await response.json();

            if (data.valid) {
                setTokenValid(true);
            } else {
                setErrors({ token: data.message || 'Invalid or expired reset token.' });
            }
        } catch (error) {
            setErrors({ token: 'Failed to verify reset token. Please try again.' });
        } finally {
            setIsVerifying(false);
        }
    };

    const validatePassword = () => {
        const newErrors = {};

        if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters long.';
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match.';
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        const validationErrors = validatePassword();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsLoading(true);

        try {
            const response = await csrfFetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage('Password successfully reset! Redirecting to login...');
                setTimeout(() => {
                    navigate('/');
                }, 3000);
            } else {
                setErrors({ submit: data.message || 'Failed to reset password.' });
            }
        } catch (error) {
            setErrors({ submit: 'Network error. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        navigate('/');
    };

    if (isVerifying) {
        return (
            <div className="password-reset-page">
                <div className="password-reset-container">
                    <div className="verification-message">
                        <div className="loading-spinner loading-spinner-lg"></div>
                        <h2>Verifying reset token...</h2>
                        <p>Please wait while we validate your password reset link.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="password-reset-page">
                <div className="password-reset-container">
                    <div className="error-state">
                        <MdError className="error-icon-large" />
                        <h2>Invalid Reset Link</h2>
                        <p>{errors.token || 'This password reset link is invalid or has expired.'}</p>
                        <button 
                            className="btn btn-primary"
                            onClick={handleBackToLogin}
                        >
                            <MdArrowBack className="button-icon" />
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (successMessage) {
        return (
            <div className="password-reset-page">
                <div className="password-reset-container">
                    <div className="success-state">
                        <MdCheckCircle className="success-icon-large" />
                        <h2>Password Reset Successful!</h2>
                        <p>{successMessage}</p>
                        <div className="success-loading">
                            <div className="loading-spinner"></div>
                            <span>Redirecting to login...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="password-reset-page">
            <div className="password-reset-container">
                <div className="modal-header-gradient">
                    <h1 className="reset-header">
                        <MdLock className="header-icon" />
                        Reset Your Password
                    </h1>
                    <p className="reset-subtitle">
                        Enter your new password below
                    </p>
                </div>

                <div className="reset-content">
                    <form onSubmit={handleSubmit} className="reset-form">
                        {errors.submit && (
                            <div className="error-message">
                                <MdError className="error-icon" />
                                <span>{errors.submit}</span>
                            </div>
                        )}

                        <div className={`form-input-group ${focusedField === 'password' ? 'focused' : ''}`}>
                            <label>
                                <MdLock className="label-icon" />
                                New Password
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField('')}
                                    required
                                    disabled={isLoading}
                                    placeholder="Enter your new password"
                                    className={errors.password ? 'error' : ''}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                >
                                    {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                                </button>
                            </div>
                            {errors.password && (
                                <div className="field-error">
                                    <span>{errors.password}</span>
                                </div>
                            )}
                        </div>

                        <div className={`form-input-group ${focusedField === 'confirmPassword' ? 'focused' : ''}`}>
                            <label>
                                <MdLock className="label-icon" />
                                Confirm New Password
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    onFocus={() => setFocusedField('confirmPassword')}
                                    onBlur={() => setFocusedField('')}
                                    required
                                    disabled={isLoading}
                                    placeholder="Confirm your new password"
                                    className={errors.confirmPassword ? 'error' : ''}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={isLoading}
                                >
                                    {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <div className="field-error">
                                    <span>{errors.confirmPassword}</span>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="reset-submit-button"
                            disabled={!password || !confirmPassword || isLoading}
                        >
                            <MdSave className="button-icon" />
                            <span>{isLoading ? 'Resetting...' : 'Reset Password'}</span>
                        </button>
                    </form>
                </div>

                <div className="form-switch-link">
                    <span>Remember your credentials?</span>
                    <button 
                        className="login-button"
                        onClick={handleBackToLogin}
                        disabled={isLoading}
                    >
                        <MdArrowBack className="button-icon" />
                        {isLoading ? 'Loading...' : 'Back to Login'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PasswordResetPage;