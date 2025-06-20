import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getHistory } from '../../store/history';
import './TransactionHistoryPage.css'; 

const TransactionHistoryPage = () => {
    const dispatch = useDispatch();
    const { items, isLoading, error, currentPage, totalPages } = useSelector(state => state.history);
    const currUser = useSelector(state => state.session.user);

    // Check for permission from the user object
    const canViewHistory = useMemo(() => currUser?.permissions?.includes('history:view_all'), [currUser]);

    useEffect(() => {
        if (canViewHistory) {
            dispatch(getHistory(currentPage));
        }
    }, [dispatch, currentPage, canViewHistory]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            dispatch(getHistory(newPage));
        }
    };

    
    if (!canViewHistory) {
        return (
            <div className="transaction-history-page unauthorized">
                <h1>Access Denied</h1>
                <p>You do not have permission to view the transaction history.</p>
            </div>
        );
    }

    if (isLoading && items.length === 0) return <div className="transaction-history-page loading">Loading history...</div>;
    if (error) return <div className="transaction-history-page error">Error loading history: {error.message || JSON.stringify(error)}</div>;

    return (
        <div className="transaction-history-page">
            <h1>Transaction History</h1>
            {items.length === 0 && !isLoading ? (
                <p>No transaction history found.</p>
            ) : (
                <>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Entity</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id}>
                                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                                    <td>{item.userPerformingAction?.username || `User ID: ${item.userId}`}</td>
                                    <td>{item.actionType}</td>
                                    <td>
                                        {item.entityType}
                                        {item.entityId ? ` (ID: ${item.entityId})` : ''}
                                        {item.relatedPot ? ` - Pot: ${item.relatedPot.name}` : ''}
                                    </td>
                                    <td>{item.description || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="pagination-controls">
                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>
                            Previous
                        </button>
                        <span>Page {currentPage} of {totalPages}</span>
                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
                            Next
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default TransactionHistoryPage;