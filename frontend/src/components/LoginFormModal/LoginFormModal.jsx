// LoginFormModal.jsx - Updated to include Forgot Password link with shared CSS
import { useState, useRef } from "react";
import * as sessionActions from "../../store/session";
import { useDispatch } from "react-redux";
import { useModal } from "../context/Modal";
import SignUpFormModal from "../SignUpFormModal";
import ForgotPasswordModal from "../ForgotPasswordModal";
import { 
    MdLogin, 
    MdPerson, 
    MdLock,
    MdAccountCircle,
    MdWarning,
    MdHelp
} from 'react-icons/md';
import './LoginFormModal.css';

function LoginFormModal() {
    const dispatch = useDispatch();
    const [credential, setCredential] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [focusedField, setFocusedField] = useState('');
    const { closeModal, setModalContent } = useModal();
    const modalRef = useRef(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrors({});
        dispatch(sessionActions.login({ credential, password }))
            .then(closeModal)
            .catch((data) => {
                if (data && data.errors) {
                    setErrors(data.errors);
                } else if (data && data.message) {
                    setErrors({ credential: data.message });
                }
            });
    };

    const switchToSignup = () => {
        setIsTransitioning(true);
        if (modalRef.current) {
            modalRef.current.classList.add('switching');
        }
        setTimeout(() => {
            setModalContent(<SignUpFormModal />);
        }, 150);
    };

    const switchToForgotPassword = () => {
        setIsTransitioning(true);
        if (modalRef.current) {
            modalRef.current.classList.add('switching');
        }
        setTimeout(() => {
            setModalContent(<ForgotPasswordModal />);
        }, 150);
    };

    const demoUserLogin = async (demoCredential, demoPassword) => {
        setErrors({});
        try {
            await dispatch(sessionActions.login({ credential: demoCredential, password: demoPassword }));
            closeModal();
        } catch (caughtError) {
            setErrors({ credential: caughtError.message || 'Demo login failed.' });
        }
    };

    const disableButton = !(credential.length >= 4 && password.length >= 6);

    return (
        <div
            className={`login-form ${isTransitioning ? 'switching' : ''}`}
            ref={modalRef}
        >
            <div className="modal-header-gradient">
                <h1 className="login-form-header">
                    <MdLogin className="header-icon" />
                    Welcome Back
                </h1>
                <p className="login-subtitle">
                    Sign in to your account
                </p>
            </div>

            <div className="login-form-content">
                <div className="demo-buttons-container">
                    <button
                        className="demo-button"
                        onClick={() => demoUserLogin('Demo-lition', 'password')}
                        disabled={isTransitioning}
                    >
                        Demo User 1
                    </button>
                    <button
                        className="demo-button"
                        onClick={() => demoUserLogin('johnsmith', 'password2')}
                        disabled={isTransitioning}
                    >
                        Demo User 2
                    </button>
                    <button
                        className="demo-button"
                        onClick={() => demoUserLogin('coderjag', 'password')}
                        disabled={isTransitioning}
                    >
                        Demo User 3
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="login-form-fields">
                    {(errors.credential || errors.message) && (
                        <div className="error-message general-error">
                            <span>{errors.credential || errors.message}</span>
                            <MdWarning className="error-icon" />
                        </div>
                    )}
                    
                    <div className={`form-input-group ${focusedField === 'credential' ? 'focused' : ''}`}>
                        <label>
                            <MdPerson className="label-icon" />
                            Username or Email
                        </label>
                        <input
                            type="text"
                            value={credential}
                            onChange={(e) => setCredential(e.target.value)}
                            onFocus={() => setFocusedField('credential')}
                            onBlur={() => setFocusedField('')}
                            required
                            disabled={isTransitioning}
                            placeholder="Enter your username or email"
                            className={errors.credential || errors.message ? 'error' : ''}
                        />
                    </div>

                    <div className={`form-input-group ${focusedField === 'password' ? 'focused' : ''}`}>
                        <label>
                            <MdLock className="label-icon" />
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setFocusedField('password')}
                            onBlur={() => setFocusedField('')}
                            required
                            disabled={isTransitioning}
                            placeholder="Enter your password"
                            className={errors.password ? 'error' : ''}
                        />
                    </div>

                    {/* Forgot Password Link */}
                    <div className="text-center my-md">
                        <button 
                            type="button"
                            className="btn-link text-primary-green text-sm font-medium flex items-center justify-center gap-xs hover:text-primary-green-hover transition-all"
                            onClick={switchToForgotPassword}
                            disabled={isTransitioning}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                borderRadius: 'var(--radius-sm)',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                color: 'var(--primary-green)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 'var(--font-weight-medium)',
                                transition: 'var(--transition-all)'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.color = 'var(--primary-green-hover)';
                                e.target.style.background = 'rgba(26, 188, 156, 0.05)';
                                e.target.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.color = 'var(--primary-green)';
                                e.target.style.background = 'none';
                                e.target.style.transform = 'translateY(0)';
                            }}
                        >
                            <MdHelp className="text-base" />
                            Forgot password or username?
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="login-submit-button"
                        disabled={disableButton || isTransitioning}
                    >
                        <MdAccountCircle className="button-icon" />
                        <span>{isTransitioning ? 'Signing In...' : 'Sign In'}</span>
                    </button>
                </form>
            </div>
            
            <div className="form-switch-link">
                <span>{`Don't have an account?`}</span>
                <button 
                    className="signup-button" 
                    onClick={switchToSignup}
                    disabled={isTransitioning}
                >
                    {isTransitioning ? 'Loading...' : 'Sign Up'}
                </button>
            </div>
        </div>
    );
}

export default LoginFormModal;