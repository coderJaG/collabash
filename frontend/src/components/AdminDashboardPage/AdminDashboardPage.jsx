// AdminDashboardPage.jsx - Enhanced with Manage Pot button (keeping View Payments)

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPots, updateAPot } from '../../store/pots';
import { fetchPaymentReport, approvePayment, denyPayment, updateUserStatus, markPaymentAsPaid } from '../../store/admin';
import { ClipLoader } from 'react-spinners';
import { MdArrowBack, MdPayment, MdWarning, MdCheckCircle, MdEdit, MdSave, MdCancel, MdHourglassTop, MdSchedule, MdBlock, MdAdd, MdSettings } from 'react-icons/md';
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
    const [viewMode, setViewMode] = useState('overview'); // 'overview', 'payments', or 'pots'
    const [filter, setFilter] = useState('all'); // 'due', 'paid', 'pending', 'scheduled', 'all'
    const [searchTerm, setSearchTerm] = useState('');
    const [editingFees, setEditingFees] = useState({});
    const [feeInputs, setFeeInputs] = useState({});
    const [feeUpdateErrors, setFeeUpdateErrors] = useState({});
    const [feeUpdateSuccess, setFeeUpdateSuccess] = useState({});

    const pots = useMemo(() => Object.values(potsObj || {}), [potsObj]);

    const userPermissions = useMemo(() => new Set(currUser?.permissions || []), [currUser]);
    const canCreatePots = userPermissions.has('pot:create');

    useEffect(() => {
        dispatch(getPots());
        dispatch(fetchPaymentReport());
    }, [dispatch]);


    useEffect(() => {
        if (location.state?.restoreView) {
            const { viewMode: restoredViewMode, selectedPotId } = location.state;

            if (selectedPotId && restoredViewMode === 'overview') {
                // Find the pot by ID and restore the PotDetailsView
                const potToRestore = pots.find(pot => pot.id === selectedPotId);
                if (potToRestore) {
                    setSelectedPot(potToRestore);
                    setViewMode('overview'); // This shows PotDetailsView
                }
            }

            // Clear the state to prevent issues on page refresh
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

    // Navigate to full pot management page
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

    // Event Handlers
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

    // Fee input handlers
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
            <div className="admin-dashboard loading">
                <ClipLoader color="#1abc9c" size={50} />
                <p>Loading dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-dashboard error-container">
                <h1>Error</h1>
                <p>{error.message || String(error)}</p>
            </div>
        );
    }

    // Pot Management View
    if (viewMode === 'pots') {
        return (
            <div className="admin-dashboard">
                <div className="admin-header-section">
                    <div className="header-with-back">
                        <button className="back-button" onClick={handleBackToDashboard}>
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
                            <button className="create-pot-button" onClick={handleCreatePot}>
                                <MdAdd /> Create New Pot
                            </button>
                        )}
                    </div>
                    <input
                        type="text"
                        placeholder="Search pots by name or banker..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-search-input"
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

    // Payment Dashboard Overview
    if (!selectedPot) {
        return (
            <div className="admin-dashboard">
                <div className="admin-header-section">
                    <h1 className="admin-header">Admin Dashboard</h1>
                    <p className="admin-subtitle">Manage pot payments, banker status, and subscription fees</p>
                </div>
                <div className="dashboard-nav-buttons">
                    <button className="nav-button" onClick={handleViewAllPots}>
                        <MdPayment /> Manage All Pots
                    </button>
                    {canCreatePots && (
                        <button className="nav-button create" onClick={handleCreatePot}>
                            <MdAdd /> Create New Pot
                        </button>
                    )}
                </div>
                <div className="admin-controls">
                    <input
                        type="text"
                        placeholder="Search pots by name or banker..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-search-input"
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

    // Individual Pot Views
    const CurrentView = viewMode === 'payments' ? PaymentDetailsView : PotDetailsView;

    return (
        <div className="admin-dashboard">
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
        <div className="pot-card">
            <div className="pot-card-header">
                <h3 className="pot-name">{pot.name}</h3>
                <div className="pot-status-indicators">
                    {stats.pendingCount > 0 && (
                        <span className="status-indicator pending" title={`${stats.pendingCount} Pending Approval`}>
                            <MdHourglassTop /> {stats.pendingCount}
                        </span>
                    )}
                    {stats.dueCount > 0 && (
                        <span className="status-indicator due" title={`${stats.dueCount} Payments Due`}>
                            <MdWarning /> {stats.dueCount}
                        </span>
                    )}
                    {stats.paidCount > 0 && (
                        <span className="status-indicator paid" title={`${stats.paidCount} Payments Paid`}>
                            <MdCheckCircle /> {stats.paidCount}
                        </span>
                    )}
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
                    <span className="stat-label">Amount Due</span>
                    <span className="stat-value amount-due">${stats.totalDue.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Status</span>
                    <span className={`stat-value status-${stats.dueCount > 0 || stats.pendingCount > 0 ? 'warning' : 'good'}`}>
                        {stats.dueCount > 0 ? `${stats.dueCount} Due` : (stats.pendingCount > 0 ? `${stats.pendingCount} Pending` : 'All Paid')}
                    </span>
                </div>
                <div className="stat-item fee-management">
                    <span className="stat-label">Subscription Fee</span>
                    {editingFees[pot.id] ? (
                        <div className="fee-edit-container">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={feeInputs[pot.id] || ''}
                                onChange={(e) => handleFeeInputChange(pot.id, e.target.value)}
                                className="fee-input"
                            />
                            <div className="fee-actions">
                                <button className="fee-save-btn" onClick={() => handleSaveFee(pot.id)}>
                                    <MdSave />
                                </button>
                                <button className="fee-cancel-btn" onClick={() => handleCancelEditFee(pot.id)}>
                                    <MdCancel />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="fee-display-container">
                            <span className="stat-value">${Number(pot.subscriptionFee || 0).toFixed(2)}</span>
                            <button className="fee-edit-btn" onClick={() => handleEditFee(pot.id, pot.subscriptionFee)}>
                                <MdEdit />
                            </button>
                        </div>
                    )}
                    {feeUpdateSuccess[pot.id] && <div className="fee-success-message">{feeUpdateSuccess[pot.id]}</div>}
                    {feeUpdateErrors[pot.id] && <div className="fee-error-message">{feeUpdateErrors[pot.id]}</div>}
                </div>
            </div>
            <div className="pot-card-footer">
                <button className="view-details-btn" onClick={() => handlePotSelect(pot)}>
                    View Details
                </button>
                {pot.paymentData?.payments.length > 0 && (
                    <button className="view-payments-btn" onClick={() => handleViewPayments(pot)}>
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
                <button className="back-button" onClick={handleBackToPots}>
                    <MdArrowBack /> All Pots
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
                        <span className="info-value">{selectedPot.Users?.length || 0}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Start Date:</span>
                        <span className="info-value">{formatDate(selectedPot.startDate) || 'Not set'}</span>
                    </div>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        className="admin-manage-pot-btn"
                        onClick={() => handleManagePot(selectedPot.id)}
                    >
                        <MdSettings />
                        Manage Pot
                    </button>
                    {selectedPot.paymentData?.payments.length > 0 && (
                        <button className="view-payments-btn primary" onClick={() => setViewMode('payments')}>
                            <MdPayment /> View Payment Details
                        </button>
                    )}
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
    </>
);

const PaymentDetailsView = ({ selectedPot, setViewMode, filteredPayments, filter, setFilter, dispatch, paymentCounts }) => (
    <>
        <div className="admin-header-section">
            <div className="header-with-back">
                <button className="back-button" onClick={() => setViewMode('overview')}>
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
        <div className="report-table-container">
            <table>
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
                                            <button className="action-btn approve" onClick={() => dispatch(approvePayment(payment.id))}>
                                                Approve
                                            </button>
                                            <button className="action-btn deny" onClick={() => dispatch(denyPayment(payment.id))}>
                                                Deny
                                            </button>
                                        </div>
                                    )}
                                    {payment.status === 'due' && (
                                        <div className="action-buttons">
                                            <button className="action-btn paid" onClick={() => dispatch(markPaymentAsPaid(payment.id))}>
                                                Mark Paid
                                            </button>
                                            {isSuspended ? (
                                                <button className="action-btn suspended" disabled>
                                                    <MdBlock /> Suspended
                                                </button>
                                            ) : canBeSuspended ? (
                                                <OpenModalButton
                                                    buttonText="Suspend Banker"
                                                    className="action-btn suspend"
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