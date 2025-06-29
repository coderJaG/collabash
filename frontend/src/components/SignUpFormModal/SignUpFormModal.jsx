// SignUpFormModal.jsx


import { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { useModal } from "../context/Modal";
import LoginFormModal from "../LoginFormModal";
import * as sessionActions from "../../store/session"
import * as usersActions from "../../store/users";
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
    const modalRef = useRef(null);

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

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setErrors({ confirmPassword: "Passwords do not match" });
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
            .catch(async (res) => {
                let errorData = { general: "Signup failed. Please try again." };
                if (res && typeof res.json === 'function') {
                    try {
                        const data = await res.json();
                        if (data && data.errors) {
                            if (Array.isArray(data.errors)) {
                                const formattedErrors = {};
                                data.errors.forEach(err => {
                                    if (typeof err === 'string') {
                                        if (err.toLowerCase().includes('username')) formattedErrors.username = err;
                                        else if (err.toLowerCase().includes('email')) formattedErrors.email = err;
                                        else (formattedErrors.general = formattedErrors.general ? `${formattedErrors.general}, ${err}` : err);
                                    } else if (err.path && err.msg) {
                                        formattedErrors[err.path] = err.msg;
                                    }
                                });
                                errorData = formattedErrors;
                            } else { 
                                errorData = data.errors;
                            }
                        } else if (data && data.message) {
                            errorData = { general: data.message };
                        }
                    } catch (jsonError) {
                        console.error("Could not parse error response JSON:", jsonError);
                    }
                } else if (res && res.message) {
                    errorData = { general: res.message };
                }
                setErrors(errorData);
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

    let disableButton = false
    const requiredFields = [firstName, lastName, email, username, mobile, password, confirmPassword]
    if (requiredFields.some(field => field.trim().length === 0) || username.length < 4 || password.length < 6) {
        disableButton = true;
    }

    return (
        <div 
            className={`signup-form ${isTransitioning ? 'switching' : ''}`}
            ref={modalRef}
        >
            <h1 className="signup-form-header">{createdByBanker ? "CREATE NEW USER" : "SIGN UP"}</h1>
            <form onSubmit={handleSubmit}>
                {errors.general && <p className="error-message general-error">{errors.general}</p>}
                
                <div className="form-input-group">
                    <label>First Name</label>
                    <input
                        type='text'
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)} 
                        required
                        disabled={isTransitioning}
                        placeholder="Enter your first name"
                    />
                    {errors.firstName && <p className="error-message">{errors.firstName}</p>}
                </div>

                <div className="form-input-group">
                    <label>Last Name</label>
                    <input
                        type='text'
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        required
                        disabled={isTransitioning}
                        placeholder="Enter your last name"
                    />
                    {errors.lastName && <p className="error-message">{errors.lastName}</p>}
                </div>

                <div className="form-input-group">
                    <label>Username</label>
                    <input
                        type='text'
                        value={username}
                        onChange={e => setUserName(e.target.value)}
                        required
                        disabled={isTransitioning}
                        placeholder="Choose a username (min 4 characters)"
                    />
                    {errors.username && <p className="error-message">{errors.username}</p>}
                </div>

                <div className="form-input-group">
                    <label>Email</label>
                    <input
                        type='email' 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        disabled={isTransitioning}
                        placeholder="Enter your email address"
                    />
                    {errors.email && <p className="error-message">{errors.email}</p>}
                </div>

                <div className="form-input-group">
                    <label>Mobile</label>
                    <input
                        type='tel'
                        value={mobile}
                        onChange={handleMobileChange}
                        required
                        disabled={isTransitioning}
                        placeholder="Enter your mobile number"
                        maxLength="12"
                    />
                    {errors.mobile && <p className="error-message">{errors.mobile}</p>}
                </div>

                <div className="form-input-group">
                    <label>Password</label>
                    <input
                        type='password' 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        disabled={isTransitioning}
                        placeholder="Choose a password (min 6 characters)"
                    />
                    {errors.password && <p className="error-message">{errors.password}</p>}
                </div>

                <div className="form-input-group">
                    <label>Confirm Password</label>
                    <input
                        type='password'
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        disabled={isTransitioning}
                        placeholder="Confirm your password"
                    />
                    {errors.confirmPassword && <p className="error-message">{errors.confirmPassword}</p>}
                </div>

                {createdByBanker && (
                    <div className="role-selection-container">
                        <label className="role-label">User Role</label>
                        <div className="radio-option">
                            <input
                                id="standard"
                                type='radio'
                                value='standard'
                                checked={role === 'standard'}
                                onChange={e => setRole(e.target.value)}
                                disabled={isTransitioning}
                            />
                            <label htmlFor="standard">Standard User</label>
                        </div>
                        <div className="radio-option">
                            <input
                                id="banker"
                                type='radio'
                                value='banker'
                                checked={role === 'banker'}
                                onChange={e => setRole(e.target.value)}
                                disabled={isTransitioning}
                            />
                            <label htmlFor="banker">Banker</label>
                        </div>
                    </div>
                )}

                <button 
                    className='signup-form-button' 
                    type="submit" 
                    disabled={disableButton || isTransitioning}
                >
                    {isTransitioning ? 'Switching...' : (createdByBanker ? "Create Account" : "Sign Up")}
                </button>
            </form>
            
            {!createdByBanker && (
                <div className="form-switch-link">
                    <span>Already have an account?</span>
                    <button 
                        className="login-button" 
                        onClick={switchToLogin}
                        disabled={isTransitioning}
                    >
                        {isTransitioning ? 'Loading...' : 'Log In'}
                    </button>
                </div>
            )}
        </div>
    )
};

export default SignUpFormModal;
