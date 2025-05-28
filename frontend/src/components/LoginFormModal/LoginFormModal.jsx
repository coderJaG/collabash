// LoginFormModal.jsx
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useModal } from '../context/Modal';
import * as sessionActions from '../../store/session';
import './LoginFormModal.css'; // Import the CSS

const LoginFormModal = () => {
    const dispatch = useDispatch();
    const [credential, setCredential] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const { closeModal } = useModal();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        try {
            // The login thunk now throws a structured error on failure
            await dispatch(sessionActions.login({ credential, password }));
            closeModal(); // Only closes if login was successful (no error thrown)
        } catch (caughtError) {
            // caughtError should be the object thrown by the login thunk
            console.error('Login modal caught error:', caughtError);
            const newErrors = {};
            if (caughtError && caughtError.errors && Object.keys(caughtError.errors).length > 0) {
                Object.assign(newErrors, caughtError.errors);
            }
            // Use top-level message for general error, or a fallback.
            // Backend validation for login often returns a single 'credential' error.
            newErrors.credential = caughtError.message || 'The provided credentials were invalid.';
            setErrors(newErrors);
        }
    };

    const demoUserLogin = async (demoCredential, demoPassword) => {
        setErrors({});
        try {
            await dispatch(sessionActions.login({ credential: demoCredential, password: demoPassword }));
            closeModal();
        } catch (caughtError) {
            console.error('Error during demo user login:', caughtError);
            setErrors({ credential: caughtError.message || 'Demo login failed.' });
        }
    };

    const disableButton = !(credential.length >= 4 && password.length >= 6);

    return (
        <div className="login-modal-content"> {/* Wrapper div */}
            <h2>LOG IN</h2>
            <div className="demo-buttons-container">
                <button className="demo-button" onClick={() => demoUserLogin('Demo-lition', 'password')}>Demo User 1</button>
                <button className="demo-button" onClick={() => demoUserLogin('TestUser1', 'password2')}>Demo User 2</button>
            </div>
            <form onSubmit={handleSubmit} className="login-form">
                {errors.credential && <p className="error-message">{errors.credential}</p>}
                {/* If you have other specific error fields from backend, add them here */}
                {/* {errors.password && <p className="error-message">{errors.password}</p>} */}

                <label htmlFor="login-credential">Email or Username: </label>
                <input
                    id="login-credential"
                    type='text'
                    value={credential}
                    onChange={e => setCredential(e.target.value)}
                    placeholder='Enter email or username'
                    required
                />
                <label htmlFor="login-password">Password: </label>
                <input
                    id="login-password"
                    type='password' // Changed to password type
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder='Enter password'
                    required
                />
                <button type='submit' disabled={disableButton} className="login-submit-button">Log In</button>
            </form>
        </div>
    );
};

export default LoginFormModal;