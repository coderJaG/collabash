// Navigation.jsx 
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { useMemo, useState, useEffect } from "react";
import { 
    MdMenu, 
    MdClose, 
    MdDashboard,
    MdAdminPanelSettings,
    MdAccountBalance,
    MdHome,
    MdGroups,
    MdHistory,
    MdChevronRight,
    MdTrendingUp
} from 'react-icons/md';
import ProfileButton from "../ProfileButton";
import Notifications from "../Notifications/Notifications";
import './Navigation.css';

const Navigation = ({ isLoaded }) => {
    const currUser = useSelector(state => state.session.user);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [hoveredItem, setHoveredItem] = useState(null);

    const userPermissions = useMemo(() => new Set(currUser?.permissions || []), [currUser]);
    const canViewHistory = userPermissions.has('history:view_all');

    // Scroll detection for navbar effects
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menu on route change
    useEffect(() => {
        setIsMenuOpen(false);
    }, [window.location.pathname]);

    const handleMenuToggle = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    // Enhanced dashboard link with role-based icons and styling
    const getDashboardLink = () => {
        if (!currUser) return null;
        
        switch (currUser.role) {
            case 'superadmin':
                return { 
                    path: '/dashboard', 
                    text: 'ADMIN PANEL', 
                    icon: <MdAdminPanelSettings />,
                    gradient: 'from-purple-600 to-purple-800'
                };
            case 'banker':
                return { 
                    path: '/dashboard', 
                    text: 'BANKER HUB', 
                    icon: <MdAccountBalance />,
                    gradient: 'from-blue-600 to-blue-800'
                };
            case 'standard':
                return { 
                    path: '/dashboard', 
                    text: 'DASHBOARD', 
                    icon: <MdDashboard />,
                    gradient: 'from-green-600 to-green-800'
                };
            default:
                return null;
        }
    };

    const dashboardLink = getDashboardLink();

    // Navigation items with enhanced data
    const navigationItems = [
        ...(!currUser ? [{ 
            path: '/', 
            text: 'HOME', 
            icon: <MdHome />,
            description: 'Return to homepage'
        }] : []),
        ...(currUser && dashboardLink ? [{ 
            ...dashboardLink,
            description: `Access your ${dashboardLink.text.toLowerCase()}`
        }] : []),
        ...(currUser ? [{ 
            path: '/users', 
            text: 'USERS', 
            icon: <MdGroups />,
            description: 'Manage platform users'
        }] : []),
        ...(currUser && canViewHistory ? [{ 
            path: '/history', 
            text: 'HISTORY', 
            icon: <MdHistory />,
            description: 'View transaction history'
        }] : [])
    ];

    const sessionNavLinks = currUser ? (
        <>
            <li className="nav-notification-item">
                <Notifications />
            </li>
            <li className="nav-profile-item">
                <ProfileButton user={currUser} />
            </li>
        </>
    ) : null;

    return (
        <>
            <nav className={`main-nav-bar ${isScrolled ? 'scrolled' : ''} ${isMenuOpen ? 'menu-open' : ''}`}>
                {/* Enhanced background with animated gradient */}
                <div className="nav-background">
                    <div className="nav-gradient-overlay"></div>
                    <div className="nav-pattern-overlay"></div>
                </div>

                <div className="nav-container">
                    <div className="nav-left">
                        <NavLink to="/" className="nav-logo">
                            <div className="logo-content">
                                <MdTrendingUp className="logo-icon" />
                                <h1>COLLABASH</h1>
                            </div>
                            <div className="logo-underline"></div>
                        </NavLink>
                        
                        <ul className="desktop-nav-links">
                            {navigationItems.map((item, index) => (
                                <li key={index} className="nav-item">
                                    <NavLink 
                                        to={item.path}
                                        className={({ isActive }) => 
                                            `nav-link ${isActive ? 'active' : ''} ${item.gradient ? 'special-link' : ''}`
                                        }
                                        onMouseEnter={() => setHoveredItem(index)}
                                        onMouseLeave={() => setHoveredItem(null)}
                                    >
                                        <span className="nav-link-content">
                                            {item.icon && <span className="nav-icon">{item.icon}</span>}
                                            <span className="nav-text">{item.text}</span>
                                            <MdChevronRight className="nav-arrow" />
                                        </span>
                                        <div className="nav-link-bg"></div>
                                    </NavLink>
                                    {hoveredItem === index && (
                                        <div className="nav-tooltip">
                                            {item.description}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="nav-right">
                        <ul className="desktop-session-links">
                            {isLoaded && sessionNavLinks}
                        </ul>
                        
                        <button 
                            className="mobile-menu-toggle"
                            onClick={handleMenuToggle}
                            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={isMenuOpen}
                        >
                            <span className="toggle-icon">
                                {isMenuOpen ? <MdClose /> : <MdMenu />}
                            </span>
                            <span className="toggle-bg"></span>
                        </button>
                    </div>
                </div>

                {/* Progress indicator */}
                <div className="nav-progress-bar"></div>
            </nav>

            {/* Enhanced Mobile Menu */}
            <div className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={closeMenu}>
                <div className={`mobile-menu-container ${isMenuOpen ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
                    <div className="mobile-menu-header">
                        <div className="mobile-logo">
                            <MdTrendingUp className="mobile-logo-icon" />
                            <span>COLLABASH</span>
                        </div>
                        <button className="mobile-close-btn" onClick={closeMenu}>
                            <MdClose />
                        </button>
                    </div>

                    <div className="mobile-menu-content">
                        <nav className="mobile-nav-section">
                            <h3 className="mobile-section-title">Navigation</h3>
                            <ul className="mobile-nav-list">
                                {navigationItems.map((item, index) => (
                                    <li key={index} className="mobile-nav-item">
                                        <NavLink 
                                            to={item.path} 
                                            onClick={closeMenu}
                                            className={({ isActive }) => 
                                                `mobile-nav-link ${isActive ? 'active' : ''}`
                                            }
                                        >
                                            <div className="mobile-link-content">
                                                <div className="mobile-link-left">
                                                    {item.icon && <span className="mobile-nav-icon">{item.icon}</span>}
                                                    <div className="mobile-link-text">
                                                        <span className="mobile-nav-title">{item.text}</span>
                                                        <span className="mobile-nav-desc">{item.description}</span>
                                                    </div>
                                                </div>
                                                <MdChevronRight className="mobile-nav-arrow" />
                                            </div>
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        {currUser && (
                            <div className="mobile-session-section">
                                <div className="mobile-divider"></div>
                                <h3 className="mobile-section-title">Account</h3>
                                <div className="mobile-session-items">
                                    {sessionNavLinks}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User info footer */}
                    {currUser && (
                        <div className="mobile-menu-footer">
                            <div className="user-info-card">
                                <div className="user-avatar">
                                    {currUser.firstName?.[0]}{currUser.lastName?.[0]}
                                </div>
                                <div className="user-details">
                                    <span className="user-name">{currUser.firstName} {currUser.lastName}</span>
                                    <span className="user-role">{currUser.role?.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Navigation;