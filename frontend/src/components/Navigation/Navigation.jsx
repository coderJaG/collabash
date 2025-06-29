import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { useMemo, useState } from "react";
import { FaBars, FaTimes } from 'react-icons/fa';
import ProfileButton from "../ProfileButton";
import Notifications from "../Notifications/Notifications";
import './Navigation.css'; 

const Navigation = ({ isLoaded }) => {
    const currUser = useSelector(state => state.session.user);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const userPermissions = useMemo(() => new Set(currUser?.permissions || []), [currUser]);
    // const canViewUsers = currUser;
    const canViewHistory = userPermissions.has('history:view_all');

    const handleMenuToggle = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    const sessionNavLinks = currUser ? (
        <>
            <li>
                <Notifications />
            </li>
            <li><ProfileButton user={currUser} /></li>
        </>
    ) : (
        <>
        </>
    );

    return (
        <>
            <nav className="main-nav-bar">
                <div className="nav-left">
                    <NavLink to="/" className="nav-logo"><h1>COLLABASH</h1></NavLink>
                    <ul className="desktop-nav-links">
                        <li><NavLink to={'/'}>HOME</NavLink></li>
                       {currUser && (<li><NavLink to={'/pots'}>POTS</NavLink></li>)}
                        {currUser && (<li><NavLink to={'/users'}>USERS</NavLink></li>)}
                        {currUser && canViewHistory && (<li><NavLink to={'/history'}>HISTORY</NavLink></li>)}
                    </ul>
                </div>
                <div className="nav-right">
                    <ul className="desktop-session-links">
                        {isLoaded && sessionNavLinks}
                    </ul>
                </div>
                <div className="mobile-menu-icon" onClick={handleMenuToggle}>
                    {isMenuOpen ? <FaTimes /> : <FaBars />}
                </div>
            </nav>
            {/* Mobile Menu Dropdown */}
            {isMenuOpen && (
                <div className="mobile-menu-dropdown">
                    <ul>
                        <li><NavLink to={'/'} onClick={closeMenu}>HOME</NavLink></li>
                        {currUser && (<li><NavLink to={'/pots'} onClick={closeMenu}>POTS</NavLink></li>)}
                        {currUser && (<li><NavLink to={'/users'} onClick={closeMenu}>USERS</NavLink></li>)}
                        {currUser && canViewHistory && (<li><NavLink to={'/history'} onClick={closeMenu}>HISTORY</NavLink></li>)}
                    </ul>
                    <hr className="mobile-menu-divider" />
                    <ul className="mobile-session-links">
                        {isLoaded && sessionNavLinks}
                    </ul>
                </div>
            )}
        </>
    );
};

export default Navigation;
