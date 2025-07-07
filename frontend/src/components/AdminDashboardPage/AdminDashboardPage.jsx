// AdminDashboardPage.jsx - Enhanced with integrated profile

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPots, updateAPot } from '../../store/pots';
import { fetchPaymentReport, approvePayment, denyPayment, updateUserStatus, markPaymentAsPaid } from '../../store/admin';
import { updateUser } from '../../store/users';
import * as sessionActions from '../../store/session';
import { ClipLoader } from 'react-spinners';
import { FaCubesStacked } from "react-icons/fa6";
import { SiQuicklook } from "react-icons/si";
import { MdArrowBack, MdPayment, MdWarning, MdCheckCircle, MdEdit, MdSave, MdCancel, MdHourglassTop, MdSchedule, MdBlock, MdAdd, MdSettings, MdPerson} from 'react-icons/md';
import { formatDate } from '../../utils/formatDate';
import OpenModalButton from '../../components/OpenModalButton';
import SuspendConfirmationModal from '../../components/SuspendConfirmationModal/SuspendConfirmationModal';
import './AdminDashboardPage.css';

const AdminDashboardPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const currUser = useSelector(state => state.session.user);
    const potsObj = useSelector(state => state.pots.allById);
    const payments = useSelector(state => Object.values(state.admin.payments || {}));
    const isLoading = useSelector(state => state.pots.isLoadingList || state.admin.isLoading);
    const error = useSelector(state => state.pots.errorList || state.admin.error);

    const [selectedPot, setSelectedPot] = useState(null);
    const [viewMode, setViewMode] = useState('overview'); // 'overview', 'payments', 'pots', 'profile'
    const [filter, setFilter] = useState('all'); // 'due', 'paid', 'pending', 'scheduled', 'all'
    const [searchTerm, setSearchTerm] = useState('');
    const [editingFees, setEditingFees] = useState({});
    const [feeInputs, setFeeInputs] = useState({});
    const [feeUpdateErrors, setFeeUpdateErrors] = useState({});
    const [feeUpdateSuccess, setFeeUpdateSuccess] = useState({});
    
    // Profile edit states
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileFormData, setProfileFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        mobile: ''
    });
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profileEditError, setProfileEditError] = useState('');
    const [profileEditSuccess, setProfileEditSuccess] = useState('');

    const pots = useMemo(() => Object.values(potsObj || {}), [potsObj]);

    const userPermissions = useMemo(() => new Set(currUser?.permissions || []), [currUser]);
    const canCreatePots = userPermissions.has('pot:create');

    useEffect(() => {
        dispatch(getPots());
        dispatch(fetchPaymentReport());
    }, [dispatch]);

    // Initialize profile form data
    useEffect(() => {
        if (currUser) {
            setProfileFormData({
                firstName: currUser.firstName || '',
                lastName: currUser.lastName || '',
                username: currUser.username || '',
                email: currUser.email || '',
                mobile: currUser.mobile || ''
            });
        }
    }, [currUser]);

    useEffect(() => {
        if (location.state?.restoreView) {
            const { viewMode: restoredViewMode, selectedPotId } = location.state;

            if (selectedPotId && restoredViewMode === 'overview') {
                const potToRestore = pots.find(pot => pot.id === selectedPotId);
                if (potToRestore) {
                    setSelectedPot(potToRestore);
                    setViewMode('overview');
                }
            }

            navigate('/dashboard', { replace: true, state: {} });
        }
    }, [location.state, pots]);

    const potPayments = useMemo(() => {
        return payments.reduce((acc, payment) => {
            const potId = payment.pot?.id;
            if (!potId) return acc;
            if (!acc[potId]) {
                acc[potId] = { pot: payment.pot, payments: [], totalDue: 0, dueCount: 0, paidCount: 0, pendingCount: 0 };
            }
            acc[potId].payments.push(payment);
            if (payment.status === 'due') {
                acc[potId].totalDue += Number(payment.amountDue);
                acc[potId].dueCount++;
            } else if (payment.status === 'paid') {
                acc[potId].paidCount++;
            } else if (payment.status === 'pending') {
                acc[potId].pendingCount++;
            }
            return acc;
        }, {});
    }, [payments]);

    const mergedPotsData = useMemo(() => pots.map(pot => ({ ...pot, paymentData: potPayments[pot.id] || { payments: [], totalDue: 0, dueCount: 0, paidCount: 0, pendingCount: 0 } })), [pots, potPayments]);

    const filteredPots = useMemo(() => {
        if (!searchTerm.trim()) return mergedPotsData;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return mergedPotsData.filter(pot => pot.name?.toLowerCase().includes(lowerSearchTerm) || pot.ownerName?.toLowerCase().includes(lowerSearchTerm));
    }, [mergedPotsData, searchTerm]);

    const paymentCounts = useMemo(() => {
        if (!selectedPot || !potPayments[selectedPot.id]) return { due: 0, pending: 0, paid: 0, scheduled: 0, all: 0 };
        const allPotPayments = potPayments[selectedPot.id].payments;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return {
            due: allPotPayments.filter(p => p.status === 'due' && new Date(p.drawDate) <= today).length,
            pending: allPotPayments.filter(p => p.status === 'pending').length,
            paid: allPotPayments.filter(p => p.status === 'paid').length,
            scheduled: allPotPayments.filter(p => p.status === 'due' && new Date(p.drawDate) > today).length,
            all: allPotPayments.length
        };
    }, [selectedPot, potPayments]);

    const filteredPaymentsForSelectedPot = useMemo(() => {
        if (!selectedPot) return [];
        const potData = potPayments[selectedPot.id];
        if (!potData) return [];
        if (filter === 'all') return potData.payments.sort((a, b) => new Date(a.drawDate) - new Date(b.drawDate));
        return potData.payments.filter(p => p.status === filter).sort((a, b) => new Date(a.drawDate) - new Date(b.drawDate));
    }, [potPayments, selectedPot, filter]);

    // Dashboard stats calculation
    const getDashboardStats = () => {
        const totalPots = pots.length;
        const activePots = pots.filter(pot => pot.status.toLowerCase() === 'active').length;
        const totalUsers = new Set(pots.flatMap(pot => pot.Users?.map(user => user.id) || [])).size;
        const totalDuePayments = payments.filter(p => p.status === 'due').length;
        const totalPendingPayments = payments.filter(p => p.status === 'pending').length;
        const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amountDue), 0);

        return [
            { label: 'Total Pots', value: totalPots.toString(), trend: '+3', color: 'primary' },
            { label: 'Active Pots', value: activePots.toString(), trend: '+2', color: 'success' },
            { label: 'Total Users', value: totalUsers.toString(), trend: '+12', color: 'info' },
            { label: 'Due Payments', value: totalDuePayments.toString(), trend: '-2', color: 'warning' },
            { label: 'Pending Approvals', value: totalPendingPayments.toString(), trend: '0', color: 'error' },
            { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, trend: '+15%', color: 'success' }
        ];
    };

    // Profile form handlers
    const handleProfileInputChange = (e) => {
        const { name, value } = e.target;
        setProfileFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMobileChange = (e) => {
        const { value } = e.target;
        const numericValue = value.replace(/[^\d]/g, '');
        const truncatedValue = numericValue.slice(0, 10);
        let formattedValue = truncatedValue;
        if (truncatedValue.length > 6) {
            formattedValue = `${truncatedValue.slice(0, 3)}-${truncatedValue.slice(3, 6)}-${truncatedValue.slice(6)}`;
        } else if (truncatedValue.length > 3) {
            formattedValue = `${truncatedValue.slice(0, 3)}-${truncatedValue.slice(3)}`;
        }
        setProfileFormData(prev => ({ ...prev, mobile: formattedValue }));
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileEditError('');
        setProfileEditSuccess('');

        if (newPassword && newPassword !== confirmPassword) {
            setProfileEditError('New passwords do not match.');
            return;
        }
        if (newPassword && newPassword.length < 6) {
            setProfileEditError('New password must be at least 6 characters long.');
            return;
        }

        const userDataToUpdate = { ...profileFormData };
        if (newPassword) {
            userDataToUpdate.password = newPassword;
        }

        try {
            const updatedUser = await dispatch(updateUser(currUser.id, userDataToUpdate));
            if (updatedUser) {
                dispatch(sessionActions.restoreUser());
                setProfileEditSuccess('Profile updated successfully!');
                setIsEditingProfile(false);
                setNewPassword('');
                setConfirmPassword('');
                setTimeout(() => setProfileEditSuccess(''), 3000);
            }
        } catch (error) {
            const errorMessage = error?.errors?.message || error?.message || 'Failed to update profile. Please try again.';
            setProfileEditError(errorMessage);
            setTimeout(() => setProfileEditError(''), 5000);
        }
    };

    // Navigation
    const handleManagePot = (potId) => {
        navigate(`/pots/${potId}`, {
            state: {
                returnToAdmin: true,
                currentViewMode: viewMode,
                selectedPotId: selectedPot?.id,
                fromPotDetails: viewMode === 'overview' && selectedPot !== null
            }
        });
    };

    const handlePotSelect = (pot) => {
        setSelectedPot(pot);
        setViewMode('overview');
        setFilter('all');
    };

    const handleViewPayments = (pot) => {
        setSelectedPot(pot);
        setViewMode('payments');
        setFilter('all');
    };

    const handleBackToPots = () => {
        setSelectedPot(null);
        setSearchTerm('');
        setViewMode('overview');
    };

    const handleCreatePot = () => {
        navigate('/pots/create');
    };

    const handleViewAllPots = () => {
        setViewMode('pots');
        setSelectedPot(null);
    };

    const handleBackToDashboard = () => {
        setViewMode('overview');
        setSelectedPot(null);
    };

    const handleSaveFee = async (potId) => {
        const newFee = feeInputs[potId];
        if (newFee === undefined || newFee === null) return;
        setFeeUpdateErrors(prev => ({ ...prev, [potId]: null }));
        setFeeUpdateSuccess(prev => ({ ...prev, [potId]: null }));
        try {
            await dispatch(updateAPot({ subscriptionFee: parseFloat(newFee) }, potId));
            setEditingFees(prev => ({ ...prev, [potId]: false }));
            setFeeUpdateSuccess(prev => ({ ...prev, [potId]: `Fee updated to $${parseFloat(newFee).toFixed(2)}` }));
            setTimeout(() => setFeeUpdateSuccess(prev => ({ ...prev, [potId]: null })), 3000);
            dispatch(getPots());
            dispatch(fetchPaymentReport());
        } catch (error) {
            const errorMessage = error?.message || 'Update failed.';
            setFeeUpdateErrors(prev => ({ ...prev, [potId]: errorMessage }));
            setTimeout(() => setFeeUpdateErrors(prev => ({ ...prev, [potId]: null })), 5000);
        }
    };

    const handleEditFee = (potId, currentFee) => {
        setEditingFees(prev => ({ ...prev, [potId]: true }));
        setFeeInputs(prev => ({ ...prev, [potId]: currentFee || '0.00' }));
    };

    const handleCancelEditFee = (potId) => {
        setEditingFees(prev => ({ ...prev, [potId]: false }));
        setFeeInputs(prev => ({ ...prev, [potId]: '' }));
        setFeeUpdateErrors(prev => ({ ...prev, [potId]: null }));
    };

    const handleFeeInputChange = (potId, value) => {
        setFeeInputs(prev => ({ ...prev, [potId]: value }));
    };

    // Loading and error states
    if (isLoading && pots.length === 0) {
        return (
            <div className="container loading-container">
                <ClipLoader color="#1abc9c" size={50} />
                <p className="loading-message">Loading dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <div className="alert alert-error">
                    <h1>Error</h1>
                    <p>{error.message || String(error)}</p>
                </div>
            </div>
        );
    }

    // Profile section render
    const renderProfileSection = () => (
        <div className="unified-dashboard-content">
            <div className="dashboard-header">
                <div className="header-with-back">
                    <button className="btn btn-secondary back-to-admin-dashboard-button" onClick={handleBackToDashboard}>
                        <MdArrowBack /> Back to Dashboard
                    </button>
                    <div>
                        <h1 className="admin-header">Profile Settings</h1>
                        <p className="admin-subtitle">Manage your account information and preferences</p>
                    </div>
                </div>
            </div>

            <div className="profile-section">
                {profileEditError && <div className="alert alert-error">{profileEditError}</div>}
                {profileEditSuccess && <div className="alert alert-success">{profileEditSuccess}</div>}

                <div className="profile-card">
                    {!isEditingProfile ? (
                        <>
                            <div className="profile-info">
                                <div className="profile-avatar">
                                    <div className="avatar-large">
                                        {currUser?.firstName?.[0]}{currUser?.lastName?.[0]}
                                    </div>
                                </div>
                                <div className="profile-details">
                                    <h3>{currUser?.firstName} {currUser?.lastName}</h3>
                                    <p className="profile-role">{currUser?.role}</p>
                                </div>
                            </div>

                            <div className="profile-fields">
                                <div className="field-row">
                                    <label>Username</label>
                                    <span>{currUser?.username}</span>
                                </div>
                                <div className="field-row">
                                    <label>Email</label>
                                    <span>{currUser?.email}</span>
                                </div>
                                <div className="field-row">
                                    <label>Mobile</label>
                                    <span>{currUser?.mobile || 'Not provided'}</span>
                                </div>
                            </div>

                            <button 
                                className="btn btn-primary"
                                onClick={() => setIsEditingProfile(true)}
                            >
                                <MdEdit /> Edit Profile
                            </button>
                        </>
                    ) : (
                        <form onSubmit={handleProfileSubmit} className="profile-edit-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={profileFormData.firstName}
                                        onChange={handleProfileInputChange}
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={profileFormData.lastName}
                                        onChange={handleProfileInputChange}
                                        className="form-input"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={profileFormData.username}
                                    onChange={handleProfileInputChange}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={profileFormData.email}
                                    onChange={handleProfileInputChange}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Mobile</label>
                                <input
                                    type="tel"
                                    name="mobile"
                                    value={profileFormData.mobile}
                                    onChange={handleMobileChange}
                                    placeholder="999-999-9999"
                                    className="form-input"
                                    required
                                />
                            </div>

                            <hr className="form-divider" />
                            <p className="password-change-info">Change Password (leave blank if you do not want to change it):</p>
                            
                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-success">
                                    <MdSave /> Save Changes
                                </button>
                                <button type="button" onClick={() => setIsEditingProfile(false)} className="btn btn-secondary">
                                    <MdCancel /> Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );

    // Dashboard overview render
    const renderDashboardOverview = () => {
        const stats = getDashboardStats();
        
        return (
            <div className="unified-dashboard-content">
                <div className="dashboard-header">
                    <h1 className="admin-header">Admin Dashboard</h1>
                    <p className="admin-subtitle">Manage pot payments, banker status, and subscription fees</p>
                </div>

                {/* Dashboard Stats */}
                <div className="stats-grid">
                    {stats.map((stat, index) => (
                        <div key={index} className={`stat-card stat-${stat.color}`}>
                            <div className="stat-content">
                                <div className="stat-value">{stat.value}</div>
                                <div className="stat-label">{stat.label}</div>
                                {stat.trend && (
                                    <div className={`stat-trend ${stat.trend.includes('+') ? 'positive' : stat.trend.includes('-') ? 'negative' : 'neutral'}`}>
                                        {stat.trend}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="quick-actions">
                    <h3>Quick Actions</h3>
                    <div className="action-buttons">
                        <button className="btn btn-secondary" onClick={handleViewAllPots}>
                            <FaCubesStacked /> Manage All Pots
                        </button>
                        {canCreatePots && (
                            <button className="btn btn-success" onClick={handleCreatePot}>
                                <MdAdd /> Create New Pot
                            </button>
                        )}
                        <button className="btn btn-purple" onClick={() => setViewMode('profile')}>
                            <MdPerson /> View Profile
                        </button>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="admin-controls">
                    <input
                        type="text"
                        placeholder="Search pots by name or banker..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="pots-grid">
                    {filteredPots.slice(0, 6).map(pot => (
                        <PotCard
                            key={pot.id}
                            pot={pot}
                            handlePotSelect={handlePotSelect}
                            handleViewPayments={handleViewPayments}
                            handleManagePot={handleManagePot}
                            editingFees={editingFees}
                            feeInputs={feeInputs}
                            feeUpdateSuccess={feeUpdateSuccess}
                            feeUpdateErrors={feeUpdateErrors}
                            handleEditFee={handleEditFee}
                            handleSaveFee={handleSaveFee}
                            handleCancelEditFee={handleCancelEditFee}
                            handleFeeInputChange={handleFeeInputChange}
                        />
                    ))}
                </div>

                {filteredPots.length > 6 && (
                    <div style={{ textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
                        <button className="btn btn-secondary" onClick={handleViewAllPots}>
                            View All Pots ({filteredPots.length})
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // Pot Management View
    if (viewMode === 'pots') {
        return (
            <div className="container">
                <div className="admin-header-section">
                    <div className="header-with-back">
                        <button className="btn btn-secondary back-to-admin-dashboard-button" onClick={handleBackToDashboard}>
                            <MdArrowBack /> Back to Dashboard
                        </button>
                        <div>
                            <h1 className="admin-header">Pot Management</h1>
                            <p className="admin-subtitle">Create and manage all pots in the system</p>
                        </div>
                    </div>
                </div>
                <div className="admin-controls">
                    <div className="control-buttons">
                        {canCreatePots && (
                            <button className="btn btn-success" onClick={handleCreatePot}>
                                <MdAdd /> Create New Pot
                            </button>
                        )}
                    </div>
                    <input
                        type="text"
                        placeholder="Search pots by name or banker..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="pots-grid">
                    {filteredPots.length > 0 ? filteredPots.map(pot => (
                        <PotCard
                            key={pot.id}
                            pot={pot}
                            handlePotSelect={handlePotSelect}
                            handleViewPayments={handleViewPayments}
                            handleManagePot={handleManagePot}
                            editingFees={editingFees}
                            feeInputs={feeInputs}
                            feeUpdateSuccess={feeUpdateSuccess}
                            feeUpdateErrors={feeUpdateErrors}
                            handleEditFee={handleEditFee}
                            handleSaveFee={handleSaveFee}
                            handleCancelEditFee={handleCancelEditFee}
                            handleFeeInputChange={handleFeeInputChange}
                        />
                    )) : (
                        <div className="no-pots-message">
                            <h3>No pots found</h3>
                            <p>{searchTerm ? 'No pots match your search.' : 'No pot data available.'}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Profile view
    if (viewMode === 'profile') {
        return (
            <div className="container">
                {renderProfileSection()}
            </div>
        );
    }

    // Dashboard Overview (Main Dashboard)
    if (!selectedPot) {
        return (
            <div className="container">
                {renderDashboardOverview()}
            </div>
        );
    }

    // Individual Pot Views
    const CurrentView = viewMode === 'payments' ? PaymentDetailsView : PotDetailsView;

    return (
        <div className="container">
            <CurrentView
                selectedPot={selectedPot}
                handleBackToPots={handleBackToPots}
                setViewMode={setViewMode}
                handleManagePot={handleManagePot}
                filteredPayments={filteredPaymentsForSelectedPot}
                filter={filter}
                setFilter={setFilter}
                dispatch={dispatch}
                paymentCounts={paymentCounts}
            />
        </div>
    );
};

// --- Child Components ---

const PotCard = ({
    pot,
    handlePotSelect,
    handleViewPayments,
    editingFees,
    feeInputs,
    feeUpdateSuccess,
    feeUpdateErrors,
    handleEditFee,
    handleSaveFee,
    handleCancelEditFee,
    handleFeeInputChange
}) => {
    const stats = {
        memberCount: pot.Users?.length || 0,
        dueCount: pot.paymentData.dueCount,
        paidCount: pot.paymentData.paidCount,
        pendingCount: pot.paymentData.pendingCount,
        totalDue: pot.paymentData.totalDue
    };

    return (
        <div className="card card-accent">
            <div className="card-body">
                <div className="pot-card-header">
                    <h3 className="pot-name">{pot.name}</h3>
                    <div className="pot-status-indicators">
                        <span className={`status-badge status-${pot.status.toLowerCase().replace(' ', '-')}`}>
                            {pot.status}
                        </span>
                        {stats.pendingCount > 0 && (
                            <span className="status-badge status-pending" title={`${stats.pendingCount} Pending Approval`}>
                                <MdHourglassTop /> {stats.pendingCount}
                            </span>
                        )}
                        {stats.dueCount > 0 && (
                            <span className="status-badge status-due" title={`${stats.dueCount} Payments Due`}>
                                <MdWarning /> {stats.dueCount}
                            </span>
                        )}
                        {stats.paidCount > 0 && (
                            <span className="status-badge status-paid" title={`${stats.paidCount} Payments Paid`}>
                                <MdCheckCircle /> {stats.paidCount}
                            </span>
                        )}
                    </div>
                </div>
                <div className="pot-card-stats">
                    <div className="stat-item">
                        <span className="form-label stat-label">Banker</span>
                        <span className="stat-value">{pot.ownerName}</span>
                    </div>
                    <div className="stat-item">
                        <span className="form-label stat-label">Members</span>
                        <span className="stat-value">{stats.memberCount}</span>
                    </div>
                    <div className="stat-item">
                        <span className="form-label stat-label">Amount Due</span>
                        <span className="stat-value amount-cell">${stats.totalDue.toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                        <span className="form-label stat-label">Status</span>
                        <span className={`stat-value status-${stats.dueCount > 0 || stats.pendingCount > 0 ? 'warning' : 'good'}`}>
                            {stats.dueCount > 0 ? `${stats.dueCount} Due` : (stats.pendingCount > 0 ? `${stats.pendingCount} Pending` : 'All Paid')}
                        </span>
                    </div>
                    <div className="stat-item fee-management">
                        <span className="form-label stat-label">Subscription Fee</span>
                        {editingFees[pot.id] ? (
                            <div className="fee-edit-container">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={feeInputs[pot.id] || ''}
                                    onChange={(e) => handleFeeInputChange(pot.id, e.target.value)}
                                    className="form-input fee-input"
                                />
                                <div className="fee-actions">
                                    <button className="icon-btn icon-btn-success" onClick={() => handleSaveFee(pot.id)}>
                                        <MdSave />
                                    </button>
                                    <button className="icon-btn icon-btn-danger" onClick={() => handleCancelEditFee(pot.id)}>
                                        <MdCancel />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="fee-display-container">
                                <span className="stat-value">${Number(pot.subscriptionFee || 0).toFixed(2)}</span>
                                <button className="icon-btn icon-btn-primary" onClick={() => handleEditFee(pot.id, pot.subscriptionFee)}>
                                    <MdEdit />
                                </button>
                            </div>
                        )}
                        {feeUpdateSuccess[pot.id] && <div className="fee-success-message">{feeUpdateSuccess[pot.id]}</div>}
                        {feeUpdateErrors[pot.id] && <div className="fee-error-message">{feeUpdateErrors[pot.id]}</div>}
                    </div>
                </div>
            </div>
            <div className="card-footer pot-card-footer">
                <button className="btn btn-secondary btn-block" onClick={() => handlePotSelect(pot)}>
                  <SiQuicklook />  View Details
                </button>
                {pot.paymentData?.payments.length > 0 && (
                    <button className="btn btn-primary btn-block" onClick={() => handleViewPayments(pot)}>
                        <MdPayment /> View Payments
                    </button>
                )}
            </div>
        </div>
    );
};

const PotDetailsView = ({ selectedPot, handleBackToPots, setViewMode, handleManagePot }) => (
    <>
        <div className="admin-header-section">
            <div className="header-with-back">
                <button className="btn btn-secondary back-to-admin-dashboard-button" onClick={handleBackToPots}>
                    <MdArrowBack /> All Pots
                </button>
                <div>
                    <h1 className="admin-header">{selectedPot.name}</h1>
                    <p className="admin-subtitle">Pot Details & Members</p>
                </div>
            </div>
        </div>
        <div className="card card-accent pot-details-container">
            <div className="card-body">
                <div className="pot-info-section">
                    <h3>Pot Information</h3>
                    <div className="pot-info-grid">
                        <div className="info-item">
                            <span className="form-label info-label">Banker:</span>
                            <span className="info-value">{selectedPot.ownerName}</span>
                        </div>
                        <div className="info-item">
                            <span className="form-label info-label">Hand Amount:</span>
                            <span className="info-value amount-cell">${Number(selectedPot.hand || 0).toFixed(2)}</span>
                        </div>
                        <div className="info-item">
                            <span className="form-label info-label">Status:</span>
                            <span className="info-value">{selectedPot.status}</span>
                        </div>
                        <div className="info-item">
                            <span className="form-label info-label">Subscription Fee:</span>
                            <span className="info-value">${Number(selectedPot.subscriptionFee || 0).toFixed(2)}</span>
                        </div>
                        <div className="info-item">
                            <span className="form-label info-label">Members:</span>
                            <span className="info-value">{selectedPot.Users?.length || 0}</span>
                        </div>
                        <div className="info-item">
                            <span className="form-label info-label">Start Date:</span>
                            <span className="info-value">{formatDate(selectedPot.startDate) || 'Not set'}</span>
                        </div>
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            className="btn btn-purple"
                            onClick={() => handleManagePot(selectedPot.id)}
                        >
                            <MdSettings />
                            Manage Pot
                        </button>
                        {selectedPot.paymentData?.payments.length > 0 && (
                            <button className="btn btn-primary" onClick={() => setViewMode('payments')}>
                                <MdPayment /> View Payment Details
                            </button>
                        )}
                    </div>
                </div>
                {selectedPot.Users && selectedPot.Users.length > 0 && (
                    <div className="members-section">
                        <h3>Members</h3>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Draw Date</th>
                                        <th>Position</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedPot.Users.map((user, index) => (
                                        <tr key={user.id}>
                                            <td>
                                                <div className="member-info">
                                                    <span className="member-name">{user.firstName} {user.lastName}</span>
                                                </div>
                                            </td>
                                            <td>{formatDate(user.potMemberDetails?.drawDate) || 'TBD'}</td>
                                            <td>{user.potMemberDetails?.displayOrder || index + 1}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </>
);

const PaymentDetailsView = ({ selectedPot, setViewMode, filteredPayments, filter, setFilter, dispatch, paymentCounts }) => (
    <>
        <div className="admin-header-section">
            <div className="header-with-back">
                <button className="btn btn-secondary back-to-admin-dashboard-button" onClick={() => setViewMode('overview')}>
                    <MdArrowBack /> Pot Details
                </button>
                <div>
                    <h1 className="admin-header">{selectedPot.name}</h1>
                    <p className="admin-subtitle">Payment Details</p>
                </div>
            </div>
        </div>
        <div className="filter-controls">
            <button onClick={() => setFilter('scheduled')} className={filter === 'scheduled' ? 'active' : ''}>
                Scheduled ({paymentCounts.scheduled})
            </button>
            <button onClick={() => setFilter('due')} className={filter === 'due' ? 'active' : ''}>
                Due ({paymentCounts.due})
            </button>
            <button onClick={() => setFilter('pending')} className={filter === 'pending' ? 'active' : ''}>
                Pending ({paymentCounts.pending})
            </button>
            <button onClick={() => setFilter('paid')} className={filter === 'paid' ? 'active' : ''}>
                Paid ({paymentCounts.paid})
            </button>
            <button onClick={() => setFilter('all')} className={filter === 'all' ? 'active' : ''}>
                All ({paymentCounts.all})
            </button>
        </div>
        <div className="table-container">
            <table className="table">
                <thead>
                    <tr>
                        <th>Banker</th>
                        <th>Draw Date</th>
                        <th>Amount Due</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredPayments.length > 0 ? filteredPayments.map(payment => {
                        const bankerRole = payment.banker?.role;
                        const isSuspended = bankerRole === 'suspended';
                        const canBeSuspended = bankerRole === 'banker';
                        return (
                            <tr key={payment.id}>
                                <td>
                                    <div className="banker-info">
                                        <span className="banker-name">{payment.banker?.username}</span>
                                        <span className="banker-real-name">{payment.banker?.firstName} {payment.banker?.lastName}</span>
                                    </div>
                                </td>
                                <td>{formatDate(payment.drawDate)}</td>
                                <td className="amount-cell">${Number(payment.amountDue).toFixed(2)}</td>
                                <td>
                                    <span className={`status-badge status-${payment.status}`}>
                                        {payment.status === 'scheduled' && <MdSchedule />} {payment.status}
                                    </span>
                                </td>
                                <td className="action-cell">
                                    {payment.status === 'pending' && (
                                        <div className="action-buttons">
                                            <button className="btn btn-success btn-sm" onClick={() => dispatch(approvePayment(payment.id))}>
                                                Approve
                                            </button>
                                            <button className="btn btn-danger btn-sm" onClick={() => dispatch(denyPayment(payment.id))}>
                                                Deny
                                            </button>
                                        </div>
                                    )}
                                    {payment.status === 'due' && (
                                        <div className="action-buttons">
                                            <button className="btn btn-primary btn-sm" onClick={() => dispatch(markPaymentAsPaid(payment.id))}>
                                                Mark Paid
                                            </button>
                                            {isSuspended ? (
                                                <button className="btn btn-secondary btn-sm" disabled>
                                                    <MdBlock /> Suspended
                                                </button>
                                            ) : canBeSuspended ? (
                                                <OpenModalButton
                                                    buttonText="Suspend Banker"
                                                    className="btn btn-warning btn-sm"
                                                    modalComponent={
                                                        <SuspendConfirmationModal
                                                            bankerName={payment.banker.username}
                                                            onConfirm={() => dispatch(updateUserStatus(payment.banker.id, 'suspended'))}
                                                        />
                                                    }
                                                />
                                            ) : null}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    }) : (
                        <tr>
                            <td colSpan="5" className="no-data-cell">No payments found for this filter.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </>
);

export default AdminDashboardPage;