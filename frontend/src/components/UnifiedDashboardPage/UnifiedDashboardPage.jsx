// UnifiedDashboardPage.jsx - Main dashboard that routes to appropriate user dashboard

import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import AdminDashboard from '../AdminDashboardPage';
import BankerDashboard from '../BankerDashboardPage';
import StandardUserDashboard from '../StandardUserDashboardPage';
import LoadingSpinner from '../LoadingSpinner';

const UnifiedDashboardPage = () => {
    const currUser = useSelector(state => state.session.user);
    
    if (!currUser) {
        return <Navigate to="/login" replace />;
    }

    // Show loading if user data is still being fetched
    if (!currUser.role) {
        return <LoadingSpinner message="Loading dashboard..." />;
    }

    // Route to appropriate dashboard based on user role
    switch (currUser.role) {
        case 'superadmin':
            return <AdminDashboard />;
        case 'banker':
            return <BankerDashboard />;
        case 'standard':
            return <StandardUserDashboard />;
        case 'suspended':
            return (
                <div className="dashboard-container error-container">
                    <h1>Account Suspended</h1>
                    <p>Your account has been suspended. Please contact support for assistance.</p>
                </div>
            );
        default:
            return (
                <div className="dashboard-container error-container">
                    <h1>Access Denied</h1>
                    <p>Invalid user role. Please contact support.</p>
                </div>
            );
    }
};

export default UnifiedDashboardPage;