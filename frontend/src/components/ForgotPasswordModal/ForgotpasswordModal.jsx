// ForgotPasswordModal.jsx
import { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { useModal } from "../context/Modal";
import LoginFormModal from "../LoginFormModal";
import * as sessionActions from "../../store/session";
import { 
    MdEmail, 
    MdPerson, 
    MdArrowBack,
    MdSend,
    MdWarning,
    MdCheckCircle
} from 'react-icons/md';
import './ForgotPasswordModal.css';

function ForgotPasswordModal() {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('password'); // 'password' or 'username'
    const [email, setEmail] = useState("");
    const [mobile, setMobile] = useState("");
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [focusedField, setFocusedField] = useState('');
    const { setModalContent } = useModal();
    const modalRef = useRef(null);

    // Mobile number formatting function
    const formatMobileNumber = (value) => {
        // Remove all non-digit characters
        const cleaned = value.replace(/\D/g, '');
        
        // Limit to 10 digits
        const limited = cleaned.slice(0, 10);
        
        // Apply formatting based on length
        if (limited.length <= 3) {
            return limited;
        } else if (limited.length <= 6) {
            return `${limited.slice(0, 3)}-${limited.slice(3)}`;
        } else {
            return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
        }
    };

    // Validate mobile number format
    const isValidMobileFormat = (value) => {
        const mobileRegex = /^\d{3}-\d{3}-\d{4}$/;
        return mobileRegex.test(value);
    };

    const handleMobileChange = (e) => {
        const formattedValue = formatMobileNumber(e.target.value);
        setMobile(formattedValue);
        
        // Clear mobile error when user starts typing
        if (errors.mobile) {
            setErrors(prev => ({ ...prev, mobile: null }));
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsLoading(true);
        setSuccessMessage("");
        try {
            const result = await dispatch(sessionActions.requestPasswordReset(email));
            setSuccessMessage(result.message || "Password reset instructions have been sent to your email.");
            setEmail("");
        } catch (error) {
            if (error.errors) {
                setErrors(error.errors);
            } else {
                setErrors({ email: error.message || 'Failed to send reset email' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleUsernameRecovery = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsLoading(true);
        setSuccessMessage("");

        // Validate mobile number format before submitting
        if (!isValidMobileFormat(mobile)) {
            setErrors({ mobile: 'Please enter a valid mobile number in format 999-999-9999' });
            setIsLoading(false);
            return;
        }

        try {
            const result = await dispatch(sessionActions.requestUsernameRecovery(mobile));
            setSuccessMessage(result.message || "Your username has been sent to your mobile number.");
            setMobile("");
        } catch (error) {
            if (error.errors) {
                setErrors(error.errors);
            } else {
                setErrors({ mobile: error.message || 'Failed to send username' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const switchToLogin = () => {
        setIsTransitioning(true);
        if (modalRef.current) {
            modalRef.current.classList.add('switching');
        }
        setTimeout(() => {
            setModalContent(<LoginFormModal />);
        }, 150);
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
        setErrors({});
        setSuccessMessage("");
        setEmail("");
        setMobile("");
    };

    return (
        <div
            className={`forgot-password-form ${isTransitioning ? 'switching' : ''}`}
            ref={modalRef}
        >
            <div className="modal-header-gradient">
                <h1 className="forgot-password-header">
                    <MdEmail className="header-icon" />
                    Account Recovery
                </h1>
                <p className="forgot-password-subtitle">
                    Recover your account credentials
                </p>
            </div>

            <div className="forgot-password-content">
                {/* Tab Navigation */}
                <div className="recovery-tabs">
                    <button
                        className={`tab-button ${activeTab === 'password' ? 'active' : ''}`}
                        onClick={() => switchTab('password')}
                        disabled={isLoading}
                    >
                        <MdEmail className="tab-icon" />
                        Reset Password
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'username' ? 'active' : ''}`}
                        onClick={() => switchTab('username')}
                        disabled={isLoading}
                    >
                        <MdPerson className="tab-icon" />
                        Recover Username
                    </button>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="success-message">
                        <MdCheckCircle className="success-icon" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Password Reset Form */}
                {activeTab === 'password' && (
                    <form onSubmit={handlePasswordReset} className="recovery-form">
                        <div className="form-description">
                            <p>{`Enter your email address and we'll send you instructions to reset your password.`}</p>
                        </div>
                        
                        {errors.email && (
                            <div className="error-message">
                                <MdWarning className="error-icon" />
                                <span>{errors.email}</span>
                            </div>
                        )}
                        
                        <div className={`form-input-group ${focusedField === 'email' ? 'focused' : ''}`}>
                            <label>
                                <MdEmail className="label-icon" />
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField('')}
                                required
                                disabled={isLoading}
                                placeholder="Enter your email address"
                                className={errors.email ? 'error' : ''}
                            />
                        </div>

                        <button
                            type="submit"
                            className="recovery-submit-button"
                            disabled={!email || isLoading}
                        >
                            <MdSend className="button-icon" />
                            <span>{isLoading ? 'Sending...' : 'Send Reset Instructions'}</span>
                        </button>
                    </form>
                )}

                {/* Username Recovery Form */}
                {activeTab === 'username' && (
                    <form onSubmit={handleUsernameRecovery} className="recovery-form">
                        <div className="form-description">
                            <p>{`Enter your mobile number and we'll send you your username.`}</p>
                        </div>
                        
                        {errors.mobile && (
                            <div className="error-message">
                                <MdWarning className="error-icon" />
                                <span>{errors.mobile}</span>
                            </div>
                        )}
                        
                        <div className={`form-input-group ${focusedField === 'mobile' ? 'focused' : ''}`}>
                            <label>
                                <MdPerson className="label-icon" />
                                Mobile Number
                            </label>
                            <input
                                type="tel"
                                value={mobile}
                                onChange={handleMobileChange}
                                onFocus={() => setFocusedField('mobile')}
                                onBlur={() => setFocusedField('')}
                                required
                                disabled={isLoading}
                                placeholder="999-999-9999"
                                className={errors.mobile ? 'error' : ''}
                                maxLength="12"
                                inputMode="numeric"
                            />
                            <div className="input-help-text">
                                Format: 999-999-9999
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="recovery-submit-button"
                            disabled={!mobile || mobile.length !== 12 || isLoading}
                        >
                            <MdSend className="button-icon" />
                            <span>{isLoading ? 'Sending...' : 'Send Username'}</span>
                        </button>
                    </form>
                )}
            </div>
            
            <div className="form-switch-link">
                <span>Remember your credentials?</span>
                <button 
                    className="login-button" 
                    onClick={switchToLogin}
                    disabled={isLoading}
                >
                    <MdArrowBack className="button-icon" />
                    {isLoading ? 'Loading...' : 'Back to Login'}
                </button>
            </div>
        </div>
    );
}

export default ForgotPasswordModal;