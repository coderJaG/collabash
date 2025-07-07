// Transaction History Page Component
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    MdHistory, 
    MdFilterList, 
    MdSearch, 
    MdRefresh, 
    MdDownload, 
    MdCalendarToday, 
    MdPerson, 
    MdDescription,
    MdClear,
    MdTrendingUp,
    MdInsights,
    MdGroup,
    MdAccountBalance
} from 'react-icons/md';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { debounce } from 'lodash';
import { getHistory } from '../../store/history';
import LoadingSpinner from '../LoadingSpinner';
import './TransactionHistoryPage.css';

const TransactionHistoryPage = () => {
    const dispatch = useDispatch();
    const { items, isLoading, error, currentPage, totalPages } = useSelector(state => state.history);
    const currUser = useSelector(state => state.session.user);

    // Local state for filters and search
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Check for permission from the user object
    const canViewHistory = useMemo(() => currUser?.permissions?.includes('history:view_all'), [currUser]);

    // Business-friendly mappings
    const actionTypeMapping = {
        'CREATE_POT': 'Created Pot',
        'UPDATE_POT': 'Modified Pot',
        'DELETE_POT': 'Deleted Pot',
        'JOIN_POT': 'Joined Pot',
        'LEAVE_POT': 'Left Pot',
        'KICK_USER': 'Removed Member',
        'MAKE_PAYMENT': 'Made Payment',
        'PAYMENT_REMINDER': 'Payment Reminder Sent',
        'CREATE_USER': 'Created Account',
        'UPDATE_USER': 'Updated Profile',
        'DELETE_USER': 'Deleted Account',
        'ROLE_CHANGE': 'Role Changed',
        'LOGIN': 'Logged In',
        'LOGOUT': 'Logged Out',
        'TRANSFER': 'Money Transfer',
        'REFUND': 'Refund Processed',
        'POT_COMPLETED': 'Pot Completed',
        'POT_CANCELLED': 'Pot Cancelled'
    };

    const categoryMapping = {
        'pot_management': 'Pot Management',
        'member_management': 'Member Management',
        'financial': 'Financial',
        'user_management': 'User Management',
        'system': 'System'
    };

    // Get unique values for filters from current items
    const filterOptions = useMemo(() => {
        const actions = [...new Set(items.map(item => actionTypeMapping[item.actionType] || item.actionType))].sort();
        const categories = [...new Set(items.map(item => categoryMapping[item.category] || item.category))].sort();
        const users = [...new Set(items
            .map(item => item.userPerformingAction)
            .filter(Boolean)
            .map(user => `${user.firstName} ${user.lastName}`))]
            .sort();
        const priorities = ['high', 'medium', 'low'];
        
        return { actions, categories, users, priorities };
    }, [items]);

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce((searchValue) => {
            setSearchTerm(searchValue);
        }, 300),
        []
    );

    // Build filters object for API call
    const buildFilters = useCallback(() => {
        const filters = {};
        
        if (searchTerm) filters.search = searchTerm;
        if (actionFilter) {
            // Map display name back to action type
            const actionType = Object.keys(actionTypeMapping).find(
                key => actionTypeMapping[key] === actionFilter
            ) || actionFilter;
            filters.actionType = actionType;
        }
        if (categoryFilter) {
            // Map display name back to category
            const category = Object.keys(categoryMapping).find(
                key => categoryMapping[key] === categoryFilter
            ) || categoryFilter;
            filters.category = category;
        }
        if (priorityFilter) filters.priority = priorityFilter;
        if (dateRange.start) filters.startDate = dateRange.start;
        if (dateRange.end) filters.endDate = dateRange.end;
        
        return filters;
    }, [searchTerm, actionFilter, categoryFilter, priorityFilter, dateRange]);

    // Enhanced data processing
    const processedItems = useMemo(() => {
        return items.map(item => {
            // Use the smart description from backend, or generate one
            const smartSummary = item.smartDescription || item.description || 
                `${item.userPerformingAction?.firstName} ${item.userPerformingAction?.lastName} performed ${item.actionType}`;
            
            return {
                ...item,
                processedActionType: actionTypeMapping[item.actionType] || item.actionType,
                processedCategory: categoryMapping[item.category] || item.category,
                smartSummary,
                amount: item.extractedAmount ? parseFloat(item.extractedAmount) : null
            };
        });
    }, [items]);

    // Statistics from backend
    const statistics = useMemo(() => {
        if (!items.length) return {
            totalRecords: 0,
            financialActions: 0,
            totalAmount: 0,
            uniqueUsers: 0,
            uniquePots: 0,
            todayActions: 0
        };

        const financialActions = processedItems.filter(item => item.isFinancial);
        const totalAmount = financialActions.reduce((sum, item) => sum + (item.amount || 0), 0);
        const uniqueUsers = new Set(processedItems.map(item => item.userId)).size;
        const uniquePots = new Set(processedItems.map(item => item.potIdContext).filter(Boolean)).size;
        const todayActions = processedItems.filter(item => isToday(new Date(item.createdAt))).length;

        return {
            totalRecords: processedItems.length,
            financialActions: financialActions.length,
            totalAmount,
            uniqueUsers,
            uniquePots,
            todayActions
        };
    }, [processedItems]);

    useEffect(() => {
        if (canViewHistory) {
            const filters = buildFilters();
            dispatch(getHistory(currentPage, itemsPerPage, filters));
        }
    }, [dispatch, currentPage, canViewHistory, itemsPerPage, buildFilters]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            const filters = buildFilters();
            dispatch(getHistory(newPage, itemsPerPage, filters));
        }
    };

    const handleRefresh = () => {
        const filters = buildFilters();
        dispatch(getHistory(currentPage, itemsPerPage, filters));
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setActionFilter('');
        setCategoryFilter('');
        setUserFilter('');
        setPriorityFilter('');
        setDateRange({ start: '', end: '' });
        
        // Immediately fetch with no filters
        dispatch(getHistory(1, itemsPerPage, {}));
    };

    const handleExport = async () => {
        try {
            // Import the export action
            const { exportHistoryData } = await import('../../store/history');
            
            // Build current filters for export
            const currentFilters = buildFilters();
            
            // Get filtered data (this will fetch all pages with current filters)
            const exportData = await dispatch(exportHistoryData(currentFilters, true));
            
            // Transform data for Excel export
            const excelData = exportData.map(item => ({
                'Date': format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm:ss'),
                'User': item.userPerformingAction ? 
                    `${item.userPerformingAction.firstName} ${item.userPerformingAction.lastName}` : 
                    'System',
                'Action': actionTypeMapping[item.actionType] || item.actionType,
                'Category': categoryMapping[item.category] || item.category || 'Other',
                'Priority': item.priority ? item.priority.toUpperCase() : 'LOW',
                'Pot': item.relatedPot?.name || '-',
                'Amount': item.extractedAmount ? `${parseFloat(item.extractedAmount).toFixed(2)}` : '-',
                'Description': item.smartDescription || item.description || 
                    `${item.userPerformingAction?.firstName || 'System'} performed ${item.actionType}`,
                'Entity Type': item.entityType || '-',
                'Entity ID': item.entityId || '-'
            }));

            // Create Excel file
            const ws = XLSX.utils.json_to_sheet(excelData);
            
            // Set column widths for better readability
            const colWidths = [
                { wch: 20 }, // Date
                { wch: 25 }, // User
                { wch: 20 }, // Action
                { wch: 15 }, // Category
                { wch: 10 }, // Priority
                { wch: 20 }, // Pot
                { wch: 12 }, // Amount
                { wch: 50 }, // Description
                { wch: 15 }, // Entity Type
                { wch: 10 }  // Entity ID
            ];
            ws['!cols'] = colWidths;
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Activity History');
            
            // Add metadata sheet
            const metaData = [
                ['Export Date', new Date().toISOString()],
                ['Total Records', exportData.length],
                ['Filters Applied', ''],
                ['Search Term', currentFilters.search || 'None'],
                ['Action Type', currentFilters.actionType || 'All'],
                ['Category', currentFilters.category || 'All'],
                ['Priority', currentFilters.priority || 'All'],
                ['Date Range', `${currentFilters.startDate || 'No start'} to ${currentFilters.endDate || 'No end'}`],
                ['Generated By', `${currUser?.firstName} ${currUser?.lastName}` || 'Unknown User'],
                ['User Role', currUser?.role || 'Unknown']
            ];
            
            const metaWs = XLSX.utils.aoa_to_sheet(metaData);
            metaWs['!cols'] = [{ wch: 20 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(wb, metaWs, 'Export Info');
            
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/octet-stream' });
            
            const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
            const filename = `activity_history_${timestamp}_${exportData.length}records.xlsx`;
            saveAs(blob, filename);
            
            // Show success message (you could add a toast notification here)
            console.log(`✅ Exported ${exportData.length} records to ${filename}`);
            
        } catch (error) {
            console.error('Export failed:', error);
            // You could show an error toast here
            alert('Export failed. Please try again.');
        }
    };

    const getActionStatusBadge = (item) => {
        let className = 'status-info';
        if (item.isFinancial) {
            className = 'status-success';
        } else if (item.priority === 'high') {
            className = 'status-error';
        } else if (item.priority === 'medium') {
            className = 'status-warning';
        }
        
        return (
            <span className={`status-badge ${className}`}>
                {item.processedActionType}
            </span>
        );
    };

    const formatSmartDate = (dateString) => {
        const date = new Date(dateString);
        
        if (isToday(date)) {
            return `Today, ${format(date, 'h:mm a')}`;
        } else if (isYesterday(date)) {
            return `Yesterday, ${format(date, 'h:mm a')}`;
        } else if (isThisWeek(date)) {
            return format(date, 'EEEE, h:mm a');
        } else {
            return format(date, 'MMM d, yyyy h:mm a');
        }
    };

    const formatCurrency = (amount) => {
        if (!amount) return null;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    if (!canViewHistory) {
        return (
            <div className="container">
                <div className="admin-header-section">
                    <h1 className="admin-header">
                        <MdHistory /> Activity History
                    </h1>
                </div>
                <div className="alert alert-error">
                    <h3>Access Denied</h3>
                    <p>You do not have permission to view the activity history.</p>
                </div>
            </div>
        );
    }

    if (isLoading && items.length === 0) {
        return (
            <div className="container loading-container">
                <div className="admin-header-section">
                    <h1 className="admin-header">
                        <MdHistory /> Activity History
                    </h1>
                </div>
                <LoadingSpinner />
                <p className="loading-message">Loading activity history...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <div className="admin-header-section">
                    <h1 className="admin-header">
                        <MdHistory /> Activity History
                    </h1>
                </div>
                <div className="alert alert-error">
                    <h3>Error Loading History</h3>
                    <p>Error loading history: {error.message || JSON.stringify(error)}</p>
                    <button className="btn btn-primary" onClick={handleRefresh}>
                        <MdRefresh /> Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="admin-header-section">
                <h1 className="admin-header">
                    <MdHistory /> Activity History
                </h1>
                <p className="admin-subtitle">
                    Track all system activities and user actions
                </p>
            </div>

            {/* Enhanced Statistics Section */}
            <div className="history-stats-enhanced">
                <div className="stat-item">
                    <div className="stat-icon">
                        <MdInsights />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Activities</span>
                        <span className="stat-value">{statistics.totalRecords}</span>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon">
                        <MdAccountBalance />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Financial Actions</span>
                        <span className="stat-value">{statistics.financialActions}</span>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon">
                        <MdGroup />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Active Users</span>
                        <span className="stat-value">{statistics.uniqueUsers}</span>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon">
                        <MdTrendingUp />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">{`Today's Activity`}</span>
                        <span className="stat-value">{statistics.todayActions}</span>
                    </div>
                </div>
                {statistics.totalAmount > 0 && (
                    <div className="stat-item financial">
                        <div className="stat-icon">
                            <MdAccountBalance />
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">Total Amount</span>
                            <span className="stat-value">{formatCurrency(statistics.totalAmount)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls Section */}
            <div className="history-controls">
                <div className="history-actions">
                    <button 
                        className="btn btn-secondary"
                        onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    >
                        <MdFilterList /> {isFiltersExpanded ? 'Hide Filters' : 'Show Filters'}
                    </button>
                    <button className="btn btn-primary" onClick={handleRefresh}>
                        <MdRefresh /> Refresh
                    </button>
                    <button className="btn btn-success" onClick={handleExport}>
                        <MdDownload /> Export to Excel
                    </button>
                </div>

                <div className="search-container">
                    <div className="search-input-wrapper">
                        <MdSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search activities..."
                            onChange={(e) => debouncedSearch(e.target.value)}
                            className="search-input history-search-input"
                        />
                    </div>
                </div>

                <div className="items-per-page">
                    <label>Show:</label>
                    <select 
                        value={itemsPerPage} 
                        onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                        className="form-select"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            {/* Enhanced Filters Section */}
            {isFiltersExpanded && (
                <div className="history-filters">
                    <h3>Filter Options</h3>
                    <div className="filters-grid">
                        <div className="form-group">
                            <label className="form-label">Action Type</label>
                            <select 
                                className="form-select"
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                            >
                                <option value="">All Actions</option>
                                {filterOptions.actions.map(action => (
                                    <option key={action} value={action}>{action}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <select 
                                className="form-select"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {filterOptions.categories.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Priority</label>
                            <select 
                                className="form-select"
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                            >
                                <option value="">All Priorities</option>
                                {filterOptions.priorities.map(priority => (
                                    <option key={priority} value={priority}>
                                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">User</label>
                            <select 
                                className="form-select"
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                            >
                                <option value="">All Users</option>
                                {filterOptions.users.map(user => (
                                    <option key={user} value={user}>{user}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input 
                                type="datetime-local"
                                className="form-input"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">End Date</label>
                            <input 
                                type="datetime-local"
                                className="form-input"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="filters-actions">
                        <button className="btn btn-secondary" onClick={handleClearFilters}>
                            <MdClear /> Clear All Filters
                        </button>
                    </div>
                </div>
            )}

            {/* History Table */}
            <div className="table-container">
                {processedItems.length === 0 && !isLoading ? (
                    <div className="no-history-message">
                        <h3>No Activities Found</h3>
                        <p>
                            {searchTerm || actionFilter || categoryFilter || userFilter || priorityFilter || dateRange.start || dateRange.end
                                ? "No activities match your search criteria."
                                : "No activities found."}
                        </p>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th><MdCalendarToday /> When</th>
                                <th><MdPerson /> Who</th>
                                <th>What Happened</th>
                                <th>Details</th>
                                <th><MdDescription /> Summary</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedItems.map(item => (
                                <tr key={item.id} className={`priority-${item.priority || 'low'}`}>
                                    <td className="date-cell">
                                        <div className="date-display">
                                            <span className="date-primary">{formatSmartDate(item.createdAt)}</span>
                                            <span className="date-secondary">
                                                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="user-info">
                                            <div className="user-avatar">
                                                {item.userPerformingAction?.firstName?.[0] || 'S'}
                                                {item.userPerformingAction?.lastName?.[0] || ''}
                                            </div>
                                            <div className="user-details">
                                                <span className="user-name">
                                                    {item.userPerformingAction 
                                                        ? `${item.userPerformingAction.firstName} ${item.userPerformingAction.lastName}`
                                                        : 'System'
                                                    }
                                                </span>
                                                <span className="user-role">
                                                    {item.userPerformingAction?.username || 'Automated'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {getActionStatusBadge(item)}
                                        {item.amount && (
                                            <div className="amount-display">
                                                {formatCurrency(item.amount)}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="entity-info">
                                            <span className="entity-type">{item.processedCategory}</span>
                                            {item.relatedPot && (
                                                <span className="related-pot">
                                                    {item.relatedPot.name}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="description-cell">
                                            {item.smartSummary}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button 
                        onClick={() => handlePageChange(currentPage - 1)} 
                        disabled={currentPage <= 1}
                        className="btn btn-secondary pagination-btn"
                    >
                        Previous
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(pageNumber => {
                            if (totalPages <= 7) return true;
                            if (pageNumber === 1 || pageNumber === totalPages) return true;
                            if (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2) return true;
                            if ((pageNumber === currentPage - 3 && currentPage > 4) || 
                                (pageNumber === currentPage + 3 && currentPage < totalPages - 3)) return 'ellipsis';
                            return false;
                        })
                        .map((pageNumber, index) => (
                           pageNumber === 'ellipsis' ?
                           <span key={`ellipsis-${index}`} className="page-ellipsis">...</span> :
                           <button 
                               key={pageNumber} 
                               onClick={() => handlePageChange(pageNumber)} 
                               className={`btn ${currentPage === pageNumber ? 'btn-primary' : 'btn-secondary'} page-number ${currentPage === pageNumber ? 'active' : ''}`}
                           >
                               {pageNumber}
                           </button>
                        ))
                    }
                    
                    <button 
                        onClick={() => handlePageChange(currentPage + 1)} 
                        disabled={currentPage >= totalPages}
                        className="btn btn-secondary pagination-btn"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default TransactionHistoryPage;