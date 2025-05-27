import { useState } from "react";
import { useDispatch } from "react-redux";
import { useModal } from "../context/Modal";
import * as sessionActions from "../../store/session"
import * as usersActions from "../../store/users";
import './SignUpFormModal.css';

const SignUpFormModal = ({createdByBanker = false}) => {
    const dispatch = useDispatch();
    const { closeModal } = useModal();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('standard'); // Default role is 'standard' for new users
    const [errors, setErrors] = useState({});
    



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

        setErrors({}); // Clear previous errors
        return dispatch(sessionActions.signUp(user, createdByBanker)) 
            .then(() => {
                closeModal();
                // If a banker created the user, refresh the list of all users
                if (createdByBanker) {
                    dispatch(usersActions.getAllUsers());
                }
            })
            .catch(async (res) => {
                // res might be undefined if the error is caught before a response (e.g. network error)
                // or if the thunk doesn't re-throw res but a custom error object.
                let errorData = { general: "Signup failed. Please try again." }; // Default error
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


    //helper to disable signup button if some creteria are not met
    let disableButton = false
    const requiredFields = [firstName, lastName, email, username, mobile, password, confirmPassword]
    if (requiredFields.some(field => field.trim().length === 0) || username.length < 4 || password.length < 6) {
        disableButton = true;
    }

    return (
        <>
            <h1 className="signup-form-header">{createdByBanker ? "Create New User Account" : "Sign Up"}</h1>
            <form className="signup-form" onSubmit={handleSubmit}>
                {errors.general && <p className="error-message">{errors.general}</p>}
                <label>First Name: </label>
                <input
                    type='text'
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)} 
                    required
                />
                {errors.firstName && <p className="error-message">{errors.firstName}</p>}

                <label>Last Name: </label>
                <input
                    type='text'
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                />
                {errors.lastName && <p className="error-message">{errors.lastName}</p>}

                <label>Username: </label>
                <input
                    type='text'
                    value={username}
                    onChange={e => setUserName(e.target.value)}
                    required
                />
                {errors.username && <p className="error-message">{errors.username}</p>}

                <label>Email: </label>
                <input
                    type='email' 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                />
                {errors.email && <p className="error-message">{errors.email}</p>}

                <label>Mobile: </label>
                <input
                    type='tel'
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    required
                />
                {errors.mobile && <p className="error-message">{errors.mobile}</p>}

                <label>Password: </label>
                <input
                    type='password' 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />
                {errors.password && <p className="error-message">{errors.password}</p>}

                <label>Confirm password: </label>
                <input
                    type='password'
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                />
                {errors.confirmPassword && <p className="error-message">{errors.confirmPassword}</p>}


                {createdByBanker && ( // Only show role selection if created by banker
                    <div>
                        <label>Role: </label>
                        <div>
                            <input
                                id="standard"
                                type='radio'
                                value='standard'
                                checked={role === 'standard'}
                                onChange={e => setRole(e.target.value)}
                            />
                            <label htmlFor="standard"> Standard</label>
                        </div>
                        <div>
                            <input
                                id="banker"
                                type='radio'
                                value='banker'
                                checked={role === 'banker'}
                                onChange={e => setRole(e.target.value)}
                            />
                            <label htmlFor="banker"> Banker</label>
                        </div>
                    </div>
                )}
                <button className='signup-form-button' type="submit" disabled={disableButton}>
                    {createdByBanker ? "Create Account" : "Sign Up"}
                </button>
            </form>
        </>
    )
};


export default SignUpFormModal;