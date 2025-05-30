// ProfileButton.jsx
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import { FcBusinessman } from 'react-icons/fc'; // Or your preferred icon
import './ProfileButton.css'; // Import the CSS
import * as sessionActions from '../../store/session';

const ProfileButton = ({ user }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const dropdownContainerRef = useRef();

    const toggleMenu = (e) => {
        e.stopPropagation();
        setShowMenu(prevShowMenu => !prevShowMenu);
    };

    useEffect(() => {
        if (!showMenu) return;

        const closeMenu = (e) => {
            if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, [showMenu]);

    const logOut = (e) => {
        e.preventDefault();
        dispatch(sessionActions.logOutCurrUser())
            .then(() => {
                setShowMenu(false); // Close menu on logout
                navigate('/');
            });
    };

 
    const dropdownClassName = `profile-dropdown ${showMenu ? 'visible' : ''}`;
    // const dropdownClassName = `profile-dropdown ${showMenu ? 'visible' : 'hidden'}`;


    return (
        <div className="profile-button-container">
        <button className='profile-button-icon' onClick={toggleMenu} aria-label="User menu" aria-expanded={showMenu}>
            <FcBusinessman />
        </button>
       
        <div className={dropdownClassName} ref={dropdownContainerRef}> 
            <div>{user.username}</div>
            <div>{user.firstName} {user.lastName}</div>
            <div>Role: {user.role}</div>
            <div><button onClick={logOut}>Log Out</button></div>
        </div>
    </div>
    );
};

export default ProfileButton;