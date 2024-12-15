import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import { FcBusinessman } from 'react-icons/fc';

import './ProfileButton.css'

import * as sessionActions from '../../store/session'

const ProfileButton = ({ user }) => {

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const ulRef = useRef();

    const toggleMenu = (e) => {
        e.stopPropagation();
        setShowMenu(!showMenu);
    };

    useEffect(() => {
        if (!showMenu) return;

        const closeMenu = (e) => {
            if (ulRef.current && !ulRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };

        document.addEventListener('click', closeMenu);

        return () => document.removeEventListener('click', closeMenu);
    }, [showMenu]);

    const logOut = (e) => {
        e.preventDefault();
        dispatch(sessionActions.logOutCurrUser())
            .then(() => navigate('/'))
    }

    const proBtnClassName = 'profile-dropdwon' + (showMenu ? '' : ' hidden');

    return (
        <>
            <button className='profile-button-icon' onClick={toggleMenu}>
                <FcBusinessman />
            </button>

            <ul className={proBtnClassName} ref={ulRef}> 
                <li>{user.username}</li>
                <li>{user.firstName} {user.lastName}</li>
                <li> <button onClick={logOut}>Log Out</button></li>
            </ul >
        </>
    )
};


export default ProfileButton;