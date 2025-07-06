// ProfileButton.jsx 
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import { 
    MdAccountCircle,
    MdPerson,
    MdEmail,
    MdBadge,
    MdLogout,
    MdSettings,
    MdDashboard,
    MdKeyboardArrowDown,
    MdAdminPanelSettings,
    MdAccountBalance,
    MdSupervisorAccount,
    MdClose
} from 'react-icons/md';
import './ProfileButton.css';
import * as sessionActions from '../../store/session';

const ProfileButton = ({ user }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const dropdownContainerRef = useRef();

    const toggleMenu = (e) => {
        e.stopPropagation();
        setShowMenu(prevShowMenu => !prevShowMenu);
    };

    const closeMenu = () => {
        setShowMenu(false);
    };

    useEffect(() => {
        if (!showMenu) return;

        const handleClickOutside = (e) => {
            if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setShowMenu(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showMenu]);

    const logOut = async (e) => {
        e.preventDefault();
        setIsLoggingOut(true);
        try {
            await dispatch(sessionActions.logOutCurrUser());
            setShowMenu(false);
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handleProfileNavigation = (path) => {
        setShowMenu(false);
        navigate(path);
    };

    // Get role-specific icon and styling
    const getRoleInfo = () => {
        switch (user.role) {
            case 'superadmin':
                return {
                    icon: <MdAdminPanelSettings />,
                    label: 'Super Admin',
                    className: 'role-superadmin',
                    color: 'from-purple-600 to-purple-800'
                };
            case 'banker':
                return {
                    icon: <MdAccountBalance />,
                    label: 'Banker',
                    className: 'role-banker',
                    color: 'from-blue-600 to-blue-800'
                };
            case 'standard':
                return {
                    icon: <MdSupervisorAccount />,
                    label: 'Standard User',
                    className: 'role-standard',
                    color: 'from-green-600 to-green-800'
                };
            default:
                return {
                    icon: <MdPerson />,
                    label: 'User',
                    className: 'role-default',
                    color: 'from-gray-600 to-gray-800'
                };
        }
    };

    const roleInfo = getRoleInfo();
    const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
    const dropdownClassName = `profile-dropdown ${showMenu ? 'visible' : ''}`;

    return (
        <div className="profile-button-container">
            <button 
                className={`profile-button-trigger ${showMenu ? 'active' : ''}`}
                onClick={toggleMenu} 
                aria-label="User menu" 
                aria-expanded={showMenu}
                aria-haspopup="true"
            >
                <div className="profile-avatar">
                    <div className={`avatar-circle ${roleInfo.className}`}>
                        {userInitials || <MdAccountCircle />}
                    </div>
                    <div className="profile-info">
                        <span className="profile-name">{user.firstName || user.username}</span>
                        <span className="profile-role">{roleInfo.label}</span>
                    </div>
                    <MdKeyboardArrowDown className={`dropdown-arrow ${showMenu ? 'rotated' : ''}`} />
                </div>
                <div className="profile-status-indicator"></div>
            </button>
           
            <div className={dropdownClassName} ref={dropdownContainerRef} role="menu">
                {/* Mobile close button */}
                <button 
                    className="dropdown-mobile-close"
                    onClick={closeMenu}
                    aria-label="Close menu"
                >
                    <MdClose />
                </button>

                {/* User Info Header */}
                <div className="profile-dropdown-header" role="menuitem">
                    <div className="header-avatar">
                        <div className={`avatar-large ${roleInfo.className}`}>
                            {userInitials || <MdAccountCircle />}
                        </div>
                        <div className="online-indicator"></div>
                    </div>
                    <div className="header-info">
                        <h3 className="header-name">{user.firstName} {user.lastName}</h3>
                        <p className="header-username">@{user.username}</p>
                        <div className="header-role">
                            {roleInfo.icon}
                            <span>{roleInfo.label}</span>
                        </div>
                    </div>
                </div>

                <div className="dropdown-divider"></div>

                {/* Scrollable content area */}
                <div className="profile-dropdown-content">
                    {/* Quick Actions */}
                    <div className="dropdown-section">
                        <h4 className="section-title">Quick Actions</h4>
                        <button 
                            className="dropdown-item action-item"
                            onClick={() => handleProfileNavigation('/dashboard')}
                            role="menuitem"
                        >
                            <MdDashboard className="item-icon" />
                            <div className="item-content">
                                <span className="item-title">Dashboard</span>
                                <span className="item-desc">View your overview</span>
                            </div>
                        </button>
                        
                        <button 
                            className="dropdown-item action-item"
                            onClick={() => handleProfileNavigation('/profile/settings')}
                            role="menuitem"
                        >
                            <MdSettings className="item-icon" />
                            <div className="item-content">
                                <span className="item-title">Settings</span>
                                <span className="item-desc">Manage your account</span>
                            </div>
                        </button>
                    </div>

                    <div className="dropdown-divider"></div>

                    {/* Account Details */}
                    <div className="dropdown-section">
                        <h4 className="section-title">Account Details</h4>
                        <div className="info-grid">
                            <div className="info-item">
                                <MdEmail className="info-icon" />
                                <div className="info-content">
                                    <span className="info-label">Email</span>
                                    <span className="info-value">{user.email || 'Not provided'}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <MdBadge className="info-icon" />
                                <div className="info-content">
                                    <span className="info-label">Member Since</span>
                                    <span className="info-value">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="dropdown-divider"></div>
                </div>

                {/* Logout Section - Fixed at bottom */}
                <div className="dropdown-footer">
                    <button 
                        className={`logout-button ${isLoggingOut ? 'loading' : ''}`}
                        onClick={logOut}
                        disabled={isLoggingOut}
                        role="menuitem"
                    >
                        {isLoggingOut ? (
                            <>
                                <div className="loading-spinner"></div>
                                <span>Signing Out...</span>
                            </>
                        ) : (
                            <>
                                <MdLogout className="logout-icon" />
                                <span>Sign Out</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileButton;