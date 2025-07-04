//LoginFormModal.jsx
import { useState, useRef } from "react";
import * as sessionActions from "../../store/session";
import { useDispatch } from "react-redux";
import { useModal } from "../context/Modal";
import SignUpFormModal from "../SignUpFormModal";
import './LoginFormModal.css';

function LoginFormModal() {
    const dispatch = useDispatch();
    const [credential, setCredential] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [isTransitioning, setIsTransitioning] = useState(false);
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
    // Function to switch to the Sign Up form
    const switchToSignup = () => {
        setIsTransitioning(true);
        if (modalRef.current) {
            modalRef.current.classList.add('switching');
        }
        setTimeout(() => {
            setModalContent(<SignUpFormModal />);
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
            className={`login-modal-content ${isTransitioning ? 'switching' : ''}`}
            ref={modalRef}
        >
            <h2>Log In</h2>
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
            <form onSubmit={handleSubmit} className="login-form">
                {errors.credential && <p className="error-message">{errors.credential}</p>}
                <label>
                    Username or Email
                    <input
                        type="text"
                        value={credential}
                        onChange={(e) => setCredential(e.target.value)}
                        required
                        disabled={isTransitioning}
                        placeholder="Enter your username or email"
                    />
                </label>
                <label>
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isTransitioning}
                        placeholder="Enter your password"
                    />
                </label>
                <button
                    type="submit"
                    className="login-submit-button"
                    disabled={disableButton || isTransitioning}
                >
                    {isTransitioning ? 'Switching...' : 'Log In'}
                </button>
            </form>
            <div className="form-switch-link">
                <span>{"Don't have an account?"}</span>
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
