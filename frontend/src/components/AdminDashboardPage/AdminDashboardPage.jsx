import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPaymentReport, markPaymentAsPaid, updateUserStatus } from '../../store/admin';
import { ClipLoader } from 'react-spinners';
import { MdArrowBack, MdPayment, MdWarning, MdCheckCircle } from 'react-icons/md';

import { formatDate } from '../../utils/formatDate';
import './AdminDashboardPage.css';

const AdminDashboardPage = () => {
    const dispatch = useDispatch();
    const payments = useSelector(state => Object.values(state.admin.payments));
    const isLoading = useSelector(state => state.admin.isLoading);
    const error = useSelector(state => state.admin.error);

    const [selectedPot, setSelectedPot] = useState(null);
    const [filter, setFilter] = useState('all'); // 'due', 'paid', 'all'
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        dispatch(fetchPaymentReport());
    }, [dispatch]);

    // Group payments by pot
    const potPayments = useMemo(() => {
        const grouped = payments.reduce((acc, payment) => {
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
        
        return Object.values(grouped);
    }, [payments]);

    // Filter pots based on search term
    const filteredPots = useMemo(() => {
        if (!searchTerm.trim()) return potPayments;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return potPayments.filter(potData =>
            potData.pot.name?.toLowerCase().includes(lowerSearchTerm)
        );
    }, [potPayments, searchTerm]);

    // Filter payments for selected pot
    const filteredPayments = useMemo(() => {
        if (!selectedPot) return [];
        const potData = potPayments.find(p => p.pot.id === selectedPot.id);
        if (!potData) return [];
        
        if (filter === 'all') return potData.payments;
        return potData.payments.filter(p => p.status === filter);
    }, [potPayments, selectedPot, filter]);

    const handleMarkAsPaid = (paymentId) => {
        dispatch(markPaymentAsPaid(paymentId));
    };

    const handleSuspendBanker = (bankerId) => {
        if (window.confirm("Are you sure you want to suspend this banker? Their access will be revoked.")) {
            dispatch(updateUserStatus(bankerId, 'suspended'));
        }
    };

    const handlePotSelect = (potData) => {
        setSelectedPot(potData.pot);
        setFilter('all');
    };

    const handleBackToPots = () => {
        setSelectedPot(null);
        setSearchTerm('');
    };

    if (isLoading && payments.length === 0) {
        return (
            <div className="admin-dashboard loading">
                <ClipLoader color="#1abc9c" size={50} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-dashboard error-container">
                <h1>Error</h1>
                <p>{error}</p>
            </div>
        );
    }

    // Pot Overview View
    if (!selectedPot) {
        return (
            <div className="admin-dashboard">
                <div className="admin-header-section">
                    <h1 className="admin-header">Admin Dashboard</h1>
                    <p className="admin-subtitle">Manage pot payments and banker status</p>
                </div>

                <div className="admin-controls">
                    <div className="search-section">
                        <input 
                            type="text" 
                            placeholder="Search pots..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="admin-search-input" 
                        />
                    </div>
                </div>

                <div className="pots-grid">
                    {filteredPots.length > 0 ? filteredPots.map(potData => (
                        <div 
                            key={potData.pot.id} 
                            className="pot-card"
                            onClick={() => handlePotSelect(potData)}
                        >
                            <div className="pot-card-header">
                                <h3 className="pot-name">{potData.pot.name}</h3>
                                <div className="pot-status-indicators">
                                    {potData.dueCount > 0 && (
                                        <span className="status-indicator due">
                                            <MdWarning />
                                            {potData.dueCount}
                                        </span>
                                    )}
                                    {potData.paidCount > 0 && (
                                        <span className="status-indicator paid">
                                            <MdCheckCircle />
                                            {potData.paidCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="pot-card-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Total Payments</span>
                                    <span className="stat-value">{potData.payments.length}</span>
                                </div>
                                
                                <div className="stat-item">
                                    <span className="stat-label">Amount Due</span>
                                    <span className="stat-value amount-due">
                                        ${potData.totalDue.toFixed(2)}
                                    </span>
                                </div>
                                
                                <div className="stat-item">
                                    <span className="stat-label">Status</span>
                                    <span className={`stat-value status-${potData.dueCount > 0 ? 'warning' : 'good'}`}>
                                        {potData.dueCount > 0 ? `${potData.dueCount} Due` : 'All Paid'}
                                    </span>
                                </div>
                            </div>

                            <div className="pot-card-footer">
                                <button className="view-details-btn">
                                    <MdPayment />
                                    View Payment Details
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="no-pots-message">
                            <MdPayment size={48} />
                            <h3>No pots found</h3>
                            <p>
                                {searchTerm ? 'No pots match your search.' : 'No payment data available.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Payment Details View
    return (
        <div className="admin-dashboard">
            <div className="admin-header-section">
                <div className="header-with-back">
                    <button className="back-button" onClick={handleBackToPots}>
                        <MdArrowBack />
                        Back to Pots
                    </button>
                    <div>
                        <h1 className="admin-header">{selectedPot.name}</h1>
                        <p className="admin-subtitle">Payment Details</p>
                    </div>
                </div>
            </div>

            <div className="filter-controls">
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
                        {filteredPayments.length > 0 ? filteredPayments.map(payment => (
                            <tr key={payment.id}>
                                <td>
                                    <div className="banker-info">
                                        <span className="banker-name">{payment.banker.username}</span>
                                        <span className="banker-real-name">
                                            {payment.banker.firstName} {payment.banker.lastName}
                                        </span>
                                    </div>
                                </td>
                                <td>{formatDate(payment.drawDate)}</td>
                                <td className="amount-cell">
                                    ${Number(payment.amountDue).toFixed(2)}
                                </td>
                                <td>
                                    <span className={`status-badge status-${payment.status}`}>
                                        {payment.status}
                                    </span>
                                </td>
                                <td className="action-cell">
                                    {payment.status === 'due' && (
                                        <div className="action-buttons">
                                            <button 
                                                className="action-btn paid" 
                                                onClick={() => handleMarkAsPaid(payment.id)}
                                            >
                                                Mark Paid
                                            </button>
                                            <button 
                                                className="action-btn suspend" 
                                                onClick={() => handleSuspendBanker(payment.bankerId)}
                                            >
                                                Suspend
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="no-data-cell">
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

export default AdminDashboardPage;