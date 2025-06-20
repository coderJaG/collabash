import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { useMemo } from "react"; 
import ProfileButton from "../ProfileButton";
import OpenModalButton from "../OpenModalButton";
import LoginFormModal from "../LoginFormModal";
import SignUpFormModal from "../SignUpFormModal";
import Notifications from "../Notifications/Notifications";
import './Navigation.css'; 

const Navigation = ({ isLoaded }) => {
    const currUser = useSelector(state => state.session.user);

    // Check permissions from the user object
    const userPermissions = useMemo(() => new Set(currUser?.permissions || []), [currUser]);
    // const canViewUsers = userPermissions.has('user:view_all');
    const canViewHistory = userPermissions.has('history:view_all');

    const sessionNavLinks = currUser ? (
        <>
            <li>
                <Notifications />
            </li>
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
                    <li><NavLink to={'/'}>HOME</NavLink></li>
                    <li><NavLink to={'/pots'}>POTS</NavLink></li>  
                    {currUser &&  (
                        <li><NavLink to={'/users'}>USERS</NavLink></li>
                    )}
                    {currUser && canViewHistory && (
                        <li><NavLink to={'/history'}>HISTORY</NavLink></li>
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
