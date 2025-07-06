import { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useModal } from "../context/Modal";
import LoginFormModal from "../LoginFormModal";
import * as sessionActions from "../../store/session"
import * as usersActions from "../../store/users";
import { 
    MdVisibility, 
    MdVisibilityOff, 
    MdCheck, 
    MdClose, 
    MdPerson, 
    MdEmail, 
    MdPhone, 
    MdLock,
    MdAccountCircle,
    MdSupervisorAccount,
    MdBusiness
} from 'react-icons/md';
import './SignUpFormModal.css';

const SignUpFormModal = ({createdByBanker = false}) => {
    const dispatch = useDispatch();
    const { closeModal, setModalContent } = useModal();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('standard');
    const [errors, setErrors] = useState({});
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [focusedField, setFocusedField] = useState('');
    const modalRef = useRef(null);

    const calculatePasswordStrength = (pwd) => {
        let strength = 0;
        if (pwd.length >= 6) strength += 1;
        if (pwd.length >= 8) strength += 1;
        if (/[A-Z]/.test(pwd)) strength += 1;
        if (/[a-z]/.test(pwd)) strength += 1;
        if (/[0-9]/.test(pwd)) strength += 1;
        if (/[^A-Za-z0-9]/.test(pwd)) strength += 1;
        return strength;
    };

    useEffect(() => {
        setPasswordStrength(calculatePasswordStrength(password));
    }, [password]);

    const handleMobileChange = (e) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        let formattedValue = '';

        if (rawValue.length > 0) {
            formattedValue = rawValue.substring(0, 3);
        }
        if (rawValue.length > 3) {
            formattedValue += '-' + rawValue.substring(3, 6);
        }
        if (rawValue.length > 6) {
            formattedValue += '-' + rawValue.substring(6, 10);
        }
        
        setMobile(formattedValue);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (password !== confirmPassword) {
            setErrors({ confirmPassword: "Passwords do not match" });
            setIsSubmitting(false);
            return;
        }

        const user = {
            firstName,
            lastName,
            username,
            email,
            mobile,
            password,
            role 
        };

        setErrors({});
        return dispatch(sessionActions.signup(user, createdByBanker)) 
            .then(() => {
                closeModal();
                if (createdByBanker) {
                    dispatch(usersActions.getAllUsers());
                }
            })
            // ✅ FIXED: This catch block now correctly handles the error object
            .catch((errorData) => {
                if (errorData && errorData.errors) {
                    setErrors(errorData.errors);
                } else if (errorData && errorData.message) {
                    setErrors({ general: errorData.message });
                } else {
                    setErrors({ general: "An unknown error occurred. Please try again." });
                }
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    const switchToLogin = () => {
        setIsTransitioning(true);
        if (modalRef.current) {
            modalRef.current.classList.add('switching');
        }
        
        setTimeout(() => {
            setModalContent(<LoginFormModal />);
        }, 100);
    };

    let disableButton = false;
    const requiredFields = [firstName, lastName, email, username, mobile, password, confirmPassword];
    if (requiredFields.some(field => field.trim().length === 0) || username.length < 4 || password.length < 6) {
        disableButton = true;
    }

    const getPasswordStrengthColor = () => {
        if (passwordStrength <= 2) return '#e74c3c';
        if (passwordStrength <= 4) return '#f39c12';
        return '#27ae60';
    };

    const getPasswordStrengthText = () => {
        if (passwordStrength <= 2) return 'Weak';
        if (passwordStrength <= 4) return 'Medium';
        return 'Strong';
    };

    return (
        <div 
            className={`signup-form ${isTransitioning ? 'switching' : ''}`}
            ref={modalRef}
        >
            <div className="modal-header-gradient">
                <h1 className="signup-form-header">
                    <MdAccountCircle className="header-icon" />
                    {createdByBanker ? "Create New User" : "Join the Platform"}
                </h1>
                <p className="signup-subtitle">
                    {createdByBanker ? "Add a new member to the system" : "Create your account to get started"}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="signup-form-content">
                {errors.general && (
                    <div className="error-message general-error">
                        <MdClose className="error-icon" />
                        <span>{errors.general}</span>
                    </div>
                )}
                
                <div className="form-row">
                    <div className={`form-input-group ${focusedField === 'firstName' ? 'focused' : ''}`}>
                        <label>
                            <MdPerson className="label-icon" />
                            First Name
                        </label>
                        <input
                            type='text'
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)} 
                            onFocus={() => setFocusedField('firstName')}
                            onBlur={() => setFocusedField('')}
                            required
                            disabled={isTransitioning || isSubmitting}
                            placeholder="Enter your first name"
                            className={errors.firstName ? 'error' : ''}
                        />
                        {errors.firstName && (
                            <p className="error-message">
                                <MdClose className="error-icon" />
                                {errors.firstName}
                            </p>
                        )}
                    </div>

                    <div className={`form-input-group ${focusedField === 'lastName' ? 'focused' : ''}`}>
                        <label>
                            <MdPerson className="label-icon" />
                            Last Name
                        </label>
                        <input
                            type='text'
                            value={lastName}
                            onChange={e => setLastName(e.target.value)}
                            onFocus={() => setFocusedField('lastName')}
                            onBlur={() => setFocusedField('')}
                            required
                            disabled={isTransitioning || isSubmitting}
                            placeholder="Enter your last name"
                            className={errors.lastName ? 'error' : ''}
                        />
                        {errors.lastName && (
                            <p className="error-message">
                                <MdClose className="error-icon" />
                                {errors.lastName}
                            </p>
                        )}
                    </div>
                </div>

                <div className={`form-input-group ${focusedField === 'username' ? 'focused' : ''}`}>
                    <label>
                        <MdAccountCircle className="label-icon" />
                        Username
                        <span className="requirement-indicator">
                            {username.length >= 4 ? <MdCheck className="valid" /> : <MdClose className="invalid" />}
                        </span>
                    </label>
                    <input
                        type='text'
                        value={username}
                        onChange={e => setUserName(e.target.value)}
                        onFocus={() => setFocusedField('username')}
                        onBlur={() => setFocusedField('')}
                        required
                        disabled={isTransitioning || isSubmitting}
                        placeholder="Choose a username (min 4 characters)"
                        className={errors.username ? 'error' : ''}
                    />
                    {errors.username && (
                        <p className="error-message">
                            <MdClose className="error-icon" />
                            {errors.username}
                        </p>
                    )}
                </div>

                <div className={`form-input-group ${focusedField === 'email' ? 'focused' : ''}`}>
                    <label>
                        <MdEmail className="label-icon" />
                        Email Address
                    </label>
                    <input
                        type='email' 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField('')}
                        required
                        disabled={isTransitioning || isSubmitting}
                        placeholder="Enter your email address"
                        className={errors.email ? 'error' : ''}
                    />
                    {errors.email && (
                        <p className="error-message">
                            <MdClose className="error-icon" />
                            {errors.email}
                        </p>
                    )}
                </div>

                <div className={`form-input-group ${focusedField === 'mobile' ? 'focused' : ''}`}>
                    <label>
                        <MdPhone className="label-icon" />
                        Mobile Number
                    </label>
                    <input
                        type='tel'
                        value={mobile}
                        onChange={handleMobileChange}
                        onFocus={() => setFocusedField('mobile')}
                        onBlur={() => setFocusedField('')}
                        required
                        disabled={isTransitioning || isSubmitting}
                        placeholder="999-999-9999"
                        maxLength="12"
                        className={errors.mobile ? 'error' : ''}
                    />
                    {errors.mobile && (
                        <p className="error-message">
                            <MdClose className="error-icon" />
                            {errors.mobile}
                        </p>
                    )}
                </div>

                <div className={`form-input-group password-group ${focusedField === 'password' ? 'focused' : ''}`}>
                    <label>
                        <MdLock className="label-icon" />
                        Password
                        <span className="requirement-indicator">
                            {password.length >= 6 ? <MdCheck className="valid" /> : <MdClose className="invalid" />}
                        </span>
                    </label>
                    <div className="password-input-wrapper">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onFocus={() => setFocusedField('password')}
                            onBlur={() => setFocusedField('')}
                            required
                            disabled={isTransitioning || isSubmitting}
                            placeholder="Choose a secure password (min 6 characters)"
                            className={errors.password ? 'error' : ''}
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                        >
                            {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                        </button>
                    </div>
                    
                    {password && (
                        <div className="password-strength">
                            <div className="strength-bar">
                                <div 
                                    className="strength-fill" 
                                    style={{ 
                                        width: `${(passwordStrength / 6) * 100}%`,
                                        backgroundColor: getPasswordStrengthColor()
                                    }}
                                />
                            </div>
                            <span 
                                className="strength-text"
                                style={{ color: getPasswordStrengthColor() }}
                            >
                                {getPasswordStrengthText()}
                            </span>
                        </div>
                    )}
                    
                    {errors.password && (
                        <p className="error-message">
                            <MdClose className="error-icon" />
                            {errors.password}
                        </p>
                    )}
                </div>

                <div className={`form-input-group password-group ${focusedField === 'confirmPassword' ? 'focused' : ''}`}>
                    <label>
                        <MdLock className="label-icon" />
                        Confirm Password
                        <span className="requirement-indicator">
                            {confirmPassword && password === confirmPassword ? 
                                <MdCheck className="valid" /> : 
                                <MdClose className="invalid" />
                            }
                        </span>
                    </label>
                    <div className="password-input-wrapper">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            onFocus={() => setFocusedField('confirmPassword')}
                            onBlur={() => setFocusedField('')}
                            required
                            disabled={isTransitioning || isSubmitting}
                            placeholder="Confirm your password"
                            className={errors.confirmPassword ? 'error' : ''}
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            tabIndex={-1}
                        >
                            {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
                        </button>
                    </div>
                    {errors.confirmPassword && (
                        <p className="error-message">
                            <MdClose className="error-icon" />
                            {errors.confirmPassword}
                        </p>
                    )}
                </div>

                {createdByBanker && (
                    <div className="role-selection-container">
                        <label className="role-label">
                            <MdSupervisorAccount className="label-icon" />
                            User Role
                        </label>
                        <div className="role-options">
                            <div className={`radio-option ${role === 'standard' ? 'selected' : ''}`}>
                                <input
                                    id="standard"
                                    type='radio'
                                    value='standard'
                                    checked={role === 'standard'}
                                    onChange={e => setRole(e.target.value)}
                                    disabled={isTransitioning || isSubmitting}
                                />
                                <label htmlFor="standard" className="radio-label-wrapper">
                                    <MdPerson className="role-icon" />
                                    <div>
                                        <span className="role-title">Standard User</span>
                                        <span className="role-description">Can join and participate in pots</span>
                                    </div>
                                </label>
                            </div>

                            <div className={`radio-option ${role === 'banker' ? 'selected' : ''}`}>
                                <input
                                    id="banker"
                                    type='radio'
                                    value='banker'
                                    checked={role === 'banker'}
                                    onChange={e => setRole(e.target.value)}
                                    disabled={isTransitioning || isSubmitting}
                                />
                                <label htmlFor="banker" className="radio-label-wrapper">
                                    <MdBusiness className="role-icon" />
                                    <div>
                                        <span className="role-title">Banker</span>
                                        <span className="role-description">Can create and manage pots</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                <button 
                    className={`signup-form-button ${isSubmitting ? 'loading' : ''}`}
                    type="submit" 
                    disabled={disableButton || isTransitioning || isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <div className="loading-spinner" />
                            <span>Creating Account...</span>
                        </>
                    ) : (
                        <>
                            <MdCheck className="button-icon" />
                            <span>{createdByBanker ? "Create Account" : "Sign Up"}</span>
                        </>
                    )}
                </button>
            </form>
            
            {!createdByBanker && (
                <div className="form-switch-link">
                    <span>Already have an account?</span>
                    <button 
                        className="login-button" 
                        onClick={switchToLogin}
                        disabled={isTransitioning || isSubmitting}
                    >
                        {isTransitioning ? 'Loading...' : 'Log In'}
                    </button>
                </div>
            )}
        </div>
    )
};

export default SignUpFormModal;
