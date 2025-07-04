// BankerDashboardPage.jsx


import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getPots } from '../../store/pots';
import { fetchBankerPaymentReport, requestPaymentApproval } from '../../store/admin';
import { ClipLoader } from 'react-spinners';
import { MdArrowBack, MdPayment, MdWarning, MdCheckCircle } from 'react-icons/md';

import { formatDate } from '../../utils/formatDate';
import './BankerDashboardPage.css';

const BankerDashboardPage = () => {
    const dispatch = useDispatch();
    const currUser = useSelector(state => state.session.user);
    const potsObj = useSelector(state => state.pots.allById);
    const payments = useSelector(state => Object.values(state.admin.payments || {}));
    const isLoadingPots = useSelector(state => state.pots.isLoadingList);
    const isLoadingPayments = useSelector(state => state.admin.isLoading);
    const potsError = useSelector(state => state.pots.errorList);
    const paymentsError = useSelector(state => state.admin.error);

    const [selectedPot, setSelectedPot] = useState(null);
    const [viewMode, setViewMode] = useState('overview'); // 'overview' or 'payments'
    const [filter, setFilter] = useState('all'); // 'due', 'paid', 'all'
    const [searchTerm, setSearchTerm] = useState('');

    const isLoading = isLoadingPots || isLoadingPayments;
    const error = potsError || paymentsError;

    // Memoize the pots array conversion and filter for banker's pots
    const bankerPots = useMemo(() => {
        const allPots = Object.values(potsObj || {});
        return allPots.filter(pot => pot.ownerId === currUser?.id);
    }, [potsObj, currUser?.id]);

    useEffect(() => {
        dispatch(getPots());
        dispatch(fetchBankerPaymentReport());
    }, [dispatch]);

    // Since the API already filters for this banker, we use payments directly
    const bankerPayments = payments;

    // Group payments by pot
    const bankerPotPayments = useMemo(() => {
        const grouped = bankerPayments.reduce((acc, payment) => {
            const potId = payment.pot?.id;
            if (!potId) return acc;

            if (!acc[potId]) {
                acc[potId] = {
                    pot: payment.pot,
                    payments: [],
                    totalDue: 0,
                    dueCount: 0,
                    paidCount: 0
                };
            }

            acc[potId].payments.push(payment);
            if (payment.status === 'due') {
                acc[potId].totalDue += Number(payment.amountDue);
                acc[potId].dueCount++;
            } else if (payment.status === 'paid') {
                acc[potId].paidCount++;
            }

            return acc;
        }, {});

        return grouped;
    }, [bankerPayments]);

    // Merge pot data with payment data
    const mergedBankerPotsData = useMemo(() => {
        return bankerPots.map(pot => {
            const paymentData = bankerPotPayments[pot.id] || {
                payments: [],
                totalDue: 0,
                dueCount: 0,
                paidCount: 0
            };

            return {
                ...pot,
                paymentData
            };
        });
    }, [bankerPots, bankerPotPayments]);

    // Filter pots based on search term
    const filteredPots = useMemo(() => {
        if (!searchTerm.trim()) return mergedBankerPotsData;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return mergedBankerPotsData.filter(pot =>
            pot.name?.toLowerCase().includes(lowerSearchTerm)
        );
    }, [mergedBankerPotsData, searchTerm]);

    // Filter payments for selected pot
    const filteredPayments = useMemo(() => {
        if (!selectedPot || viewMode !== 'payments') return [];
        const potData = bankerPotPayments[selectedPot.id];
        if (!potData) return [];

        if (filter === 'all') return potData.payments;
        return potData.payments.filter(p => p.status === filter);
    }, [bankerPotPayments, selectedPot, viewMode, filter]);

    // Calculate pot statistics
    const calculatePotStats = (pot) => {
        const memberCount = pot.Users?.length || 0;
        const subscriptionFee = parseFloat(pot.subscriptionFee) || 0;

        // Use actual payment data if available
        if (pot.paymentData) {
            return {
                memberCount,
                dueCount: pot.paymentData.dueCount,
                paidCount: pot.paymentData.paidCount,
                totalDue: pot.paymentData.totalDue,
                subscriptionFee
            };
        }

        // Fallback for demo
        const dueCount = Math.floor(memberCount * 0.3);
        const paidCount = memberCount - dueCount;
        const totalDue = subscriptionFee * dueCount;

        return {
            memberCount,
            dueCount,
            paidCount,
            totalDue,
            subscriptionFee
        };
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

  

    const handleRequestApproval = (paymentId) => {
        dispatch(requestPaymentApproval(paymentId));
    };

    if (isLoading && bankerPots.length === 0) {
        return (
            <div className="banker-dashboard loading">
                <ClipLoader color="#1abc9c" size={50} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="banker-dashboard banker-error-container">
                <h1>Error</h1>
                <p>{error}</p>
            </div>
        );
    }

    // Pot Overview View
    if (!selectedPot) {
        return (
            <div className="banker-dashboard">
                <div className="banker-header-section">
                    <h1 className="banker-header">My Pots Dashboard</h1>
                    <p className="banker-subtitle">Manage subscription fees for your pots</p>
                </div>

                <div className="banker-controls">
                    <div className="banker-search-section">
                        <input
                            type="text"
                            placeholder="Search your pots..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="banker-search-input"
                        />
                    </div>
                </div>

                <div className="banker-pots-grid">
                    {filteredPots.length > 0 ? filteredPots.map(pot => {
                        const stats = calculatePotStats(pot);

                        return (
                            <div
                                key={pot.id}
                                className="banker-pot-card"
                            >
                                <div className="banker-pot-card-header">
                                    <h3 className="banker-pot-name">{pot.name}</h3>
                                    <div className="banker-pot-status-indicators">
                                        {stats.dueCount > 0 && (
                                            <span className="banker-status-indicator due">
                                                <MdWarning />
                                                {stats.dueCount}
                                            </span>
                                        )}
                                        {stats.paidCount > 0 && (
                                            <span className="banker-status-indicator paid">
                                                <MdCheckCircle />
                                                {stats.paidCount}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="banker-pot-card-stats">
                                    <div className="banker-stat-item">
                                        <span className="banker-stat-label">Members</span>
                                        <span className="banker-stat-value">{stats.memberCount}</span>
                                    </div>

                                    <div className="banker-stat-item">
                                        <span className="banker-stat-label">Amount Due</span>
                                        <span className="banker-stat-value amount-due">
                                            ${stats.totalDue.toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="banker-stat-item">
                                        <span className="banker-stat-label">Status</span>
                                        <span className={`banker-stat-value status-${stats.dueCount > 0 ? 'warning' : 'good'}`}>
                                            {stats.dueCount > 0 ? `${stats.dueCount} Due` : 'All Paid'}
                                        </span>
                                    </div>

                                    <div className="banker-stat-item">
                                        <span className="banker-stat-label">Subscription Fee</span>
                                        <span className="banker-stat-value">
                                            ${Number(pot.subscriptionFee || 0).toFixed(2)}
                                        </span>
                                        <small className="fee-note">(Set by admin)</small>
                                    </div>
                                </div>

                                <div className="banker-pot-card-footer">
                                    <button className="banker-view-details-btn" onClick={() => handlePotSelect(pot)}>       
                                        View Pot Details
                                    </button>
                                    {pot.paymentData.payments.length > 0 && (
                                        <button className="banker-view-payments-btn" onClick={() => handleViewPayments(pot)}>
                                            <MdPayment />
                                            View Payments
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="banker-no-pots-message">
                            <MdPayment size={48} />
                            <h3>No pots found</h3>
                            <p>
                                {searchTerm ? 'No pots match your search.' : 'You don\'t have any pots yet.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Pot Details View (Overview Mode)
    if (viewMode === 'overview') {
        return (
            <div className="banker-dashboard">
                <div className="banker-header-section">
                    <div className="banker-header-with-back">
                        <button className="banker-back-button" onClick={handleBackToPots}>
                            <MdArrowBack />
                            Back to My Pots
                        </button>
                        <div>
                            <h1 className="banker-header">{selectedPot.name}</h1>
                            <p className="banker-subtitle">Pot Details & Members</p>
                        </div>
                    </div>
                </div>

                <div className="pot-details-container">
                    <div className="pot-info-section">
                        <h3>Pot Information</h3>
                        <div className="pot-info-grid">
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
                                <span className="info-value">{selectedPot.startDate || 'Not set'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">End Date:</span>
                                <span className="info-value">{selectedPot.endDate || 'Not set'}</span>
                            </div>
                        </div>

                        {selectedPot.paymentData?.payments.length > 0 && (
                            <button className="banker-view-payments-btn primary" onClick={() => setViewMode('payments')}>
                                <MdPayment />
                                View Fee Collection Details
                            </button>
                        )}
                    </div>

                    {selectedPot.Users && selectedPot.Users.length > 0 && (
                        <div className="members-section">
                            <h3>Members & Fee Status</h3>
                            <div className="members-table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Draw Date</th>
                                            <th>Position</th>
                                            <th>Fee Status</th>
                                            <th>Note</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPot.Users.map((user, index) => {
                                            // Find payment data for this user
                                            const userPayment = selectedPot.paymentData?.payments.find(
                                                p => p.bankerId === user.id
                                            );

                                            return (
                                                <tr key={user.id}>
                                                    <td>
                                                        <div className="member-info">
                                                            <span className="member-name">
                                                                {user.firstName} {user.lastName}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {user.potMemberDetails?.drawDate
                                                            ? formatDate(user.potMemberDetails.drawDate)
                                                            : 'TBD'}
                                                    </td>
                                                    <td>{user.potMemberDetails?.displayOrder || index + 1}</td>
                                                    <td>
                                                        {userPayment ? (
                                                            <span className={`fee-status ${userPayment.status}`}>
                                                                {userPayment.status === 'paid' ? 'Paid' : `Due: ${Number(userPayment.amountDue).toFixed(2)}`}
                                                            </span>
                                                        ) : (
                                                            <span className="fee-status due">
                                                                Due: ${Number(selectedPot.subscriptionFee || 0).toFixed(2)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="fee-note">
                                                            {userPayment?.status === 'due' ? 'Awaiting payment' : '-'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Payment Details View
    return (
        <div className="banker-dashboard">
            <div className="banker-header-section">
                <div className="banker-header-with-back">
                    <button className="banker-back-button" onClick={() => setViewMode('overview')}>
                        <MdArrowBack />
                        Back to Pot Details
                    </button>
                    <div>
                        <h1 className="banker-header">{selectedPot.name}</h1>
                        <p className="banker-subtitle">Fee Collection Details</p>
                    </div>
                </div>
            </div>

            <div className="banker-filter-controls">
                <button
                    onClick={() => setFilter('due')}
                    className={filter === 'due' ? 'active' : ''}
                >
                    Due ({filteredPayments.filter(p => p.status === 'due').length})
                </button>
                <button
                    onClick={() => setFilter('paid')}
                    className={filter === 'paid' ? 'active' : ''}
                >
                    Paid ({filteredPayments.filter(p => p.status === 'paid').length})
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={filter === 'all' ? 'active' : ''}
                >
                    All ({filteredPayments.length})
                </button>
            </div>

            <div className="banker-report-table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Member</th>
                            <th>Due Date</th>
                            <th>Amount Due</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPayments.length > 0 ? filteredPayments.map(payment => (
                            <tr key={payment.id}>
                                <td>
                                    <div className="banker-member-info">
                                        <span className="banker-member-name">{payment.banker.username}</span>
                                        <span className="banker-member-real-name">
                                            {payment.banker.firstName} {payment.banker.lastName}
                                        </span>
                                    </div>
                                </td>
                                <td>{formatDate(payment.drawDate)}</td>
                                <td className="banker-amount-cell">
                                    ${Number(payment.amountDue).toFixed(2)}
                                </td>
                                <td>
                                    <span className={`banker-status-badge status-${payment.status}`}>
                                        {payment.status}
                                    </span>
                                </td>
                                <td className="banker-action-cell">
                                    {payment.status === 'due' && (
                                        <button
                                            className="action-btn request-approval"
                                            onClick={() => handleRequestApproval(payment.id)}
                                        >
                                            Request Approval
                                        </button>
                                    )}
                                    {payment.status === 'pending' && (
                                        <span className="status-badge status-pending">
                                            Pending Approval
                                        </span>
                                    )}
                                    {payment.status === 'paid' && (
                                        <span className="status-badge status-paid">
                                            Paid
                                        </span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="banker-no-data-cell">
                                    No payments found for this filter.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BankerDashboardPage;