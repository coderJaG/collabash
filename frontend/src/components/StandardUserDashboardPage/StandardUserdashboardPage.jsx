// StandardUserDashboard.jsx - Enhanced with consistent AdminDashboard styling

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPots } from '../../store/pots';
import { fetchSentRequests, createJoinRequest } from '../../store/requests';
import { ClipLoader } from 'react-spinners';
import { MdArrowBack, MdPayment, MdSend, MdHourglassTop, MdSettings } from 'react-icons/md';
import { formatDate } from '../../utils/formatDate';
import './StandardUserDashboardPage.css';

const StandardUserDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const currUser = useSelector(state => state.session.user);
    const potsObj = useSelector(state => state.pots.allById);
    const isLoadingPots = useSelector(state => state.pots.isLoadingList);
    const potsError = useSelector(state => state.pots.errorList);
    const sentRequests = useSelector(state => state.requests.sentRequests);
    const isRequestingJoin = useSelector(state => state.requests.isLoading);

    const [selectedPot, setSelectedPot] = useState(null);
    const [viewMode, setViewMode] = useState('overview'); // 'overview', 'myPots', 'findPots'
    const [searchTerm, setSearchTerm] = useState('');

    const userPermissions = useMemo(() => new Set(currUser?.permissions || []), [currUser]);
    const canRequestToJoin = userPermissions.has('request:create');

    useEffect(() => {
        dispatch(getPots());
        if (canRequestToJoin) {
            dispatch(fetchSentRequests());
        }
    }, [dispatch, canRequestToJoin]);

    useEffect(() => {
        if (location.state?.restoreView) {
            const { viewMode: restoredViewMode, selectedPotId } = location.state;

            if (selectedPotId && restoredViewMode === 'overview') {
                // Find the pot by ID and restore the PotDetailsView
                const potToRestore = allPotsArray.find(pot => pot.id === selectedPotId);
                if (potToRestore) {
                    setSelectedPot(potToRestore);
                    setViewMode('overview'); // This shows PotDetailsView
                }
            }

            // Clear the state to prevent issues on page refresh
            navigate('/dashboard', { replace: true, state: {} });
        }
    }, [location.state, navigate]);

    const allPotsArray = useMemo(() => potsObj ? Object.values(potsObj) : [], [potsObj]);

    const pendingRequestPotIds = useMemo(() => {
        return new Set(
            Object.values(sentRequests || {})
                .filter(req => req.status === 'pending')
                .map(req => req.potId)
        );
    }, [sentRequests]);

    // User's pots (owner or member)
    const myPots = useMemo(() => {
        return allPotsArray.filter(pot => 
            pot.ownerId === currUser?.id || 
            pot.Users?.some(user => user.id === currUser?.id)
        );
    }, [allPotsArray, currUser?.id]);

    // Available pots to join
    const availablePots = useMemo(() => {
        return allPotsArray.filter(pot => 
            pot.ownerId !== currUser?.id && 
            !pot.Users?.some(user => user.id === currUser?.id)
        );
    }, [allPotsArray, currUser?.id]);

    // Filter pots based on search term and view mode
    const filteredPots = useMemo(() => {
        let potsToFilter = [];
        
        if (viewMode === 'myPots') {
            potsToFilter = myPots;
        } else if (viewMode === 'findPots') {
            potsToFilter = availablePots;
        } else {
            potsToFilter = myPots; // Default to myPots in overview
        }

        if (searchTerm.trim()) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            potsToFilter = potsToFilter.filter(pot =>
                pot.name?.toLowerCase().includes(lowerSearchTerm) ||
                pot.ownerName?.toLowerCase().includes(lowerSearchTerm) ||
                pot.status?.toLowerCase().includes(lowerSearchTerm)
            );
        }

        return potsToFilter;
    }, [myPots, availablePots, viewMode, searchTerm]);

    // Navigate to full pot management page
    const handleManagePot = (potId) => {
        navigate(`/pots/${potId}`, {
            state: {
                returnToUser: true,
                currentViewMode: viewMode,
                selectedPotId: selectedPot?.id,
                fromPotDetails: viewMode === 'overview' && selectedPot !== null
            }
        });
    };

    // Event Handlers
    const handlePotSelect = (pot) => {
        setSelectedPot(pot);
        setViewMode('overview');
    };

    const handleBackToPots = () => {
        setSelectedPot(null);
        setSearchTerm('');
        setViewMode('overview');
    };

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        setSelectedPot(null);
        setSearchTerm('');
    };

    const handleBackToDashboard = () => {
        setViewMode('overview');
        setSelectedPot(null);
    };

    const handleRequestToJoin = async (potId, e) => {
        e.stopPropagation();
        if (!potId) return;
        
        try {
            await dispatch(createJoinRequest(potId));
        } catch (error) {
            console.error('Error creating join request:', error);
        }
    };

    const calculatePotStats = (pot) => {
        const memberCount = pot.Users?.length || 0;
        const isMember = pot.Users?.some(user => user.id === currUser?.id);
        const isOwner = pot.ownerId === currUser?.id;
        
        return {
            memberCount,
            isMember,
            isOwner,
            subscriptionFee: parseFloat(pot.subscriptionFee || 0)
        };
    };

    // Loading and error states
    if (isLoadingPots && allPotsArray.length === 0) {
        return (
            <div className="admin-dashboard loading">
                <ClipLoader color="#1abc9c" size={50} />
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    if (potsError) {
        return (
            <div className="admin-dashboard error-container">
                <h1>Error</h1>
                <p>{potsError.message || String(potsError)}</p>
            </div>
        );
    }

    // Find Available Pots View
    if (viewMode === 'findPots') {
        return (
            <div className="admin-dashboard">
                <div className="admin-header-section">
                    <div className="header-with-back">
                        <button className="back-button" onClick={handleBackToDashboard}>
                            <MdArrowBack /> Back to Dashboard
                        </button>
                        <div>
                            <h1 className="admin-header">Available Pots</h1>
                            <p className="admin-subtitle">Find pots to join as a participant</p>
                        </div>
                    </div>
                </div>
                <div className="admin-controls">
                    <input
                        type="text"
                        placeholder="Search available pots..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-search-input"
                    />
                </div>
                <div className="pots-grid">
                    {filteredPots.length > 0 ? filteredPots.map(pot => {
                        const stats = calculatePotStats(pot);
                        const hasPendingRequest = pendingRequestPotIds.has(pot.id);

                        return (
                            <div key={pot.id} className="pot-card">
                                <div className="pot-card-header">
                                    <h3 className="pot-name">{pot.name}</h3>
                                    <div className="pot-status-indicators">
                                        <span className={`status-indicator status-${pot.status.toLowerCase().replace(' ', '-')}`}>
                                            {pot.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="pot-card-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Banker</span>
                                        <span className="stat-value">{pot.ownerName}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Members</span>
                                        <span className="stat-value">{stats.memberCount}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Pot Amount</span>
                                        <span className="stat-value amount-due">
                                            ${Number(pot.amount || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Hand Amount</span>
                                        <span className="stat-value amount-due">
                                            ${Number(pot.hand || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Start Date</span>
                                        <span className="stat-value">
                                            {pot.startDate ? formatDate(pot.startDate) : 'TBD'}
                                        </span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Subscription Fee</span>
                                        <span className="stat-value">
                                            ${Number(pot.subscriptionFee || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="pot-card-footer">
                                    <button 
                                        className="view-details-btn" 
                                        onClick={() => handlePotSelect(pot)}
                                    >
                                        View Details
                                    </button>
                                    
                                    {canRequestToJoin && (
                                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                                            {hasPendingRequest ? (
                                                <button className="request-btn pending" disabled>
                                                    <MdHourglassTop /> Request Pending
                                                </button>
                                            ) : (
                                                <button 
                                                    className="request-btn" 
                                                    onClick={(e) => handleRequestToJoin(pot.id, e)}
                                                    disabled={isRequestingJoin}
                                                >
                                                    {isRequestingJoin ? (
                                                        <ClipLoader color="white" size={16} />
                                                    ) : (
                                                        <>
                                                            <MdSend /> Request to Join
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="no-pots-message">
                            <h3>No available pots found</h3>
                            <p>
                                {searchTerm ? 'No pots match your search.' : 'No pots available to join at this time.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // My Pots Management View
    if (viewMode === 'myPots') {
        return (
            <div className="admin-dashboard">
                <div className="admin-header-section">
                    <div className="header-with-back">
                        <button className="back-button" onClick={handleBackToDashboard}>
                            <MdArrowBack /> Back to Dashboard
                        </button>
                        <div>
                            <h1 className="admin-header">My Pots</h1>
                            <p className="admin-subtitle">Manage your pot participation</p>
                        </div>
                    </div>
                </div>
                <div className="admin-controls">
                    <input
                        type="text"
                        placeholder="Search your pots..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-search-input"
                    />
                </div>
                <div className="pots-grid">
                    {filteredPots.length > 0 ? filteredPots.map(pot => (
                        <UserPotCard
                            key={pot.id}
                            pot={pot}
                            handlePotSelect={handlePotSelect}
                            handleManagePot={handleManagePot}
                            calculatePotStats={calculatePotStats}
                            currUser={currUser}
                        />
                    )) : (
                        <div className="no-pots-message">
                            <h3>No pots found</h3>
                            <p>
                                {searchTerm ? 'No pots match your search.' : 'You are not currently part of any pots.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Dashboard Overview (Main Dashboard)
    if (!selectedPot) {
        return (
            <div className="admin-dashboard">
                <div className="admin-header-section">
                    <h1 className="admin-header">My Dashboard</h1>
                    <p className="admin-subtitle">Manage your pot participation and find new opportunities</p>
                </div>

                <div className="dashboard-nav-buttons">
                    <button className="nav-button" onClick={() => handleViewModeChange('myPots')}>
                        <MdPayment /> My Pots ({myPots.length})
                    </button>
                    <button className="nav-button" onClick={() => handleViewModeChange('findPots')}>
                        <MdSend /> Find Pots to Join
                    </button>
                </div>

                <div className="admin-controls">
                    <input
                        type="text"
                        placeholder="Search your pots..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-search-input"
                    />
                </div>

                <div className="pots-grid">
                    {filteredPots.length > 0 ? filteredPots.map(pot => (
                        <UserPotCard
                            key={pot.id}
                            pot={pot}
                            handlePotSelect={handlePotSelect}
                            handleManagePot={handleManagePot}
                            calculatePotStats={calculatePotStats}
                            currUser={currUser}
                        />
                    )) : (
                        <div className="no-pots-message">
                            <h3>No pots found</h3>
                            <p>
                                {searchTerm ? 'No pots match your search.' : 'You are not currently part of any pots.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Pot Details View
    return (
        <div className="admin-dashboard">
            <PotDetailsView
                selectedPot={selectedPot}
                handleBackToPots={handleBackToPots}
                handleManagePot={handleManagePot}
                currUser={currUser}
            />
        </div>
    );
};

// --- Child Components ---

const UserPotCard = ({ pot, handlePotSelect, handleManagePot, calculatePotStats }) => {
    const stats = calculatePotStats(pot);

    return (
        <div className="pot-card">
            <div className="pot-card-header">
                <h3 className="pot-name">{pot.name}</h3>
                <div className="pot-status-indicators">
                    <span className={`status-indicator status-${pot.status.toLowerCase().replace(' ', '-')}`}>
                        {pot.status}
                    </span>
                </div>
            </div>
            <div className="pot-card-stats">
                <div className="stat-item">
                    <span className="stat-label">Banker</span>
                    <span className="stat-value">{pot.ownerName}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Members</span>
                    <span className="stat-value">{stats.memberCount}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Pot Amount</span>
                    <span className="stat-value amount-due">${Number(pot.amount || 0).toFixed(2)}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Hand Amount</span>
                    <span className="stat-value amount-due">${Number(pot.hand || 0).toFixed(2)}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">My Role</span>
                    <span className={`stat-value role-badge ${stats.isOwner ? 'owner' : stats.isMember ? 'member' : 'none'}`}>
                        {stats.isOwner ? 'Banker' : stats.isMember ? 'Member' : 'Not Member'}
                    </span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Subscription Fee</span>
                    <span className="stat-value">${Number(pot.subscriptionFee || 0).toFixed(2)}</span>
                </div>
            </div>
            <div className="pot-card-footer">
                <button className="view-details-btn" onClick={() => handlePotSelect(pot)}>
                    View Details
                </button>
                <button className="manage-pot-btn" onClick={() => handleManagePot(pot.id)}>
                    <MdSettings /> {stats.isOwner ? 'Manage Pot' : 'View Full Details'}
                </button>
            </div>
        </div>
    );
};

const PotDetailsView = ({ selectedPot, handleBackToPots, handleManagePot, currUser }) => {
    const stats = {
        memberCount: selectedPot.Users?.length || 0,
        isMember: selectedPot.Users?.some(user => user.id === currUser?.id),
        isOwner: selectedPot.ownerId === currUser?.id
    };

    return (
        <>
            <div className="admin-header-section">
                <div className="header-with-back">
                    <button className="back-button" onClick={handleBackToPots}>
                        <MdArrowBack /> Back to Dashboard
                    </button>
                    <div>
                        <h1 className="admin-header">{selectedPot.name}</h1>
                        <p className="admin-subtitle">Pot Details & Members</p>
                    </div>
                </div>
            </div>
            <div className="pot-details-container">
                <div className="pot-info-section">
                    <h3>Pot Information</h3>
                    <div className="pot-info-grid">
                        <div className="info-item">
                            <span className="info-label">Banker:</span>
                            <span className="info-value">{selectedPot.ownerName}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Pot Amount:</span>
                            <span className="info-value">${Number(selectedPot.amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Hand Amount:</span>
                            <span className="info-value">${Number(selectedPot.hand || 0).toFixed(2)}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Status:</span>
                            <span className="info-value">{selectedPot.status}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Subscription Fee:</span>
                            <span className="info-value">${Number(selectedPot.subscriptionFee || 0).toFixed(2)}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Members:</span>
                            <span className="info-value">{stats.memberCount}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Start Date:</span>
                            <span className="info-value">{formatDate(selectedPot.startDate) || 'Not set'}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">My Role:</span>
                            <span className={`info-value role-badge ${stats.isOwner ? 'owner' : stats.isMember ? 'member' : 'none'}`}>
                                {stats.isOwner ? 'Banker' : stats.isMember ? 'Member' : 'Not Member'}
                            </span>
                        </div>
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            className="admin-manage-pot-btn"
                            onClick={() => handleManagePot(selectedPot.id)}
                        >
                            <MdSettings />
                            {stats.isOwner ? 'Manage Pot' : 'View Full Details'}
                        </button>
                    </div>
                </div>
                {selectedPot.Users && selectedPot.Users.length > 0 && (
                    <div className="members-section">
                        <h3>Members</h3>
                        <div className="members-table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Draw Date</th>
                                        <th>Position</th>
                                        <th>Role</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedPot.Users.map((user, index) => (
                                        <tr key={user.id}>
                                            <td>
                                                <div className="member-info">
                                                    <span className="member-name">
                                                        {user.firstName} {user.lastName}
                                                        {user.id === currUser?.id && ' (You)'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>{formatDate(user.potMemberDetails?.drawDate) || 'TBD'}</td>
                                            <td>{user.potMemberDetails?.displayOrder || index + 1}</td>
                                            <td>
                                                <span className={`role-badge ${user.id === selectedPot.ownerId ? 'owner' : 'member'}`}>
                                                    {user.id === selectedPot.ownerId ? 'Banker' : 'Member'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default StandardUserDashboard;