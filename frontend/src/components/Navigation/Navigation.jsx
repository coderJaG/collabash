// Navigation.jsx
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import ProfileButton from "../ProfileButton";
import OpenModalButton from "../OpenModalButton";
import LoginFormModal from "../LoginFormModal";
import SignUpFormModal from "../SignUpFormModal";
import './Navigation.css'; // Import the CSS

const Navigation = ({ isLoaded }) => {
    const currUser = useSelector(state => state.session.user);

    const sessionNavLinks = currUser ? (
        <>
            {/* ProfileButton will be wrapped in its own container for positioning */}
            <li><ProfileButton user={currUser} /></li>
        </>
    ) : (
        <>
            <li className="login">
                <OpenModalButton
                    buttonText="Log In"
                    modalComponent={<LoginFormModal />}
                />
            </li>
            <li className="signup">
                <OpenModalButton
                    buttonText="Sign Up"
                    modalComponent={<SignUpFormModal />}
                />
            </li>
        </>
    );

    return (
        <nav className="main-nav-bar">
            <div className="nav-left">
                <h1>COLLABASH</h1>
                <ul>
                    <li><NavLink to={'/'}>Home</NavLink></li>
                    <li><NavLink to={'/pots'}>Pots</NavLink></li>
                    <li><NavLink to={'/users'}>Users</NavLink></li>
                    {currUser && currUser.role === 'banker' && (
                        <li><NavLink to={'/history'}>History</NavLink></li>
                    )}
                </ul>
            </div>
            <div className="nav-right">
                <ul>
                    {isLoaded && sessionNavLinks}
                </ul>
            </div>
        </nav>
    );
};

export default Navigation;