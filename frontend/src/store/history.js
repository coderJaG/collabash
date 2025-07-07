// frontend/src/store/history.js
import { csrfFetch } from './csrf';

const FETCH_HISTORY_START = 'history/FETCH_HISTORY_START';
const FETCH_HISTORY_SUCCESS = 'history/FETCH_HISTORY_SUCCESS';
const FETCH_HISTORY_FAILURE = 'history/FETCH_HISTORY_FAILURE';
const FETCH_STATISTICS_START = 'history/FETCH_STATISTICS_START';
const FETCH_STATISTICS_SUCCESS = 'history/FETCH_STATISTICS_SUCCESS';
const FETCH_STATISTICS_FAILURE = 'history/FETCH_STATISTICS_FAILURE';
const CLEAR_HISTORY = 'history/CLEAR_HISTORY';

// Action creators
const fetchHistoryStart = () => ({ type: FETCH_HISTORY_START });
const fetchHistorySuccess = (data) => ({ type: FETCH_HISTORY_SUCCESS, payload: data });
const fetchHistoryFailure = (error) => ({ type: FETCH_HISTORY_FAILURE, payload: error });

const fetchStatisticsStart = () => ({ type: FETCH_STATISTICS_START });
const fetchStatisticsSuccess = (data) => ({ type: FETCH_STATISTICS_SUCCESS, payload: data });
const fetchStatisticsFailure = (error) => ({ type: FETCH_STATISTICS_FAILURE, payload: error });

const clearHistory = () => ({ type: CLEAR_HISTORY });

// Thunk actions
// Enhanced thunk action for getting history with filters
export const getHistory = (page = 1, limit = 20, filters = {}) => async (dispatch) => {
    dispatch(fetchHistoryStart());
    
    try {
        // Build query parameters
        const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });

        // Add filters to query params
        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== '') {
                queryParams.append(key, value);
            }
        });

        const response = await csrfFetch(`/api/history?${queryParams.toString()}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ 
                message: 'Failed to fetch history' 
            }));
            throw new Error(errorData.message || 'Failed to fetch history');
        }
        
        const data = await response.json();
        dispatch(fetchHistorySuccess(data));
        
        return data;
    } catch (error) {
        const errorMessage = error.message || 'Failed to fetch history and parse error.';
        dispatch(fetchHistoryFailure({ message: errorMessage }));
        throw error;
    }
};

export const getHistoryStatistics = (filters = {}) => async (dispatch) => {
    dispatch(fetchStatisticsStart());
    
    try {
        const queryParams = new URLSearchParams();
        
        // Add date filters for statistics
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);

        const response = await csrfFetch(`/api/history/statistics?${queryParams.toString()}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ 
                message: 'Failed to fetch statistics' 
            }));
            throw new Error(errorData.message || 'Failed to fetch statistics');
        }
        
        const data = await response.json();
        dispatch(fetchStatisticsSuccess(data));
        
        return data;
    } catch (error) {
        const errorMessage = error.message || 'Failed to fetch statistics.';
        dispatch(fetchStatisticsFailure({ message: errorMessage }));
        throw error;
    }
};

// Advanced search with debouncing support
export const searchHistory = (searchTerm, filters = {}, page = 1, limit = 20) => async (dispatch) => {
    const searchFilters = {
        ...filters,
        search: searchTerm
    };
    
    return dispatch(getHistory(page, limit, searchFilters));
};

// Clear history data (useful for logout or page navigation)
export const clearHistoryData = () => (dispatch) => {
    dispatch(clearHistory());
};

// Get filtered history count without fetching all data (useful for showing counts)
export const getHistoryCount = (filters = {}) => async () => {
    try {
        const queryParams = new URLSearchParams({
            ...filters,
            page: 1,
            limit: 1 // Just get count, not actual data
        });

        const response = await csrfFetch(`/api/history?${queryParams.toString()}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch history count');
        }
        
        const data = await response.json();
        return data.totalItems || 0;
    } catch (error) {
        console.error('Failed to get history count:', error);
        return 0;
    }
};

// Search history with smart suggestions
export const searchHistoryWithSuggestions = (searchTerm) => async (dispatch) => {
    try {
        if (!searchTerm || searchTerm.length < 2) {
            return { results: [], suggestions: [] };
        }

        const filters = { search: searchTerm, limit: 50 }; // Limit for quick search
        const data = await dispatch(getHistory(1, 50, filters));
        
        // Generate search suggestions based on results
        const suggestions = [];
        const items = data.history || [];
        
        // Extract unique action types that match
        const matchingActions = [...new Set(
            items.map(item => item.actionType)
                 .filter(action => action.toLowerCase().includes(searchTerm.toLowerCase()))
        )];
        
        // Extract unique user names that match
        const matchingUsers = [...new Set(
            items.map(item => item.userPerformingAction)
                 .filter(user => user && (
                     user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
                 ))
                 .map(user => `${user.firstName} ${user.lastName}`)
        )];
        
        // Extract unique pot names that match
        const matchingPots = [...new Set(
            items.map(item => item.relatedPot)
                 .filter(pot => pot && pot.name.toLowerCase().includes(searchTerm.toLowerCase()))
                 .map(pot => pot.name)
        )];

        suggestions.push(
            ...matchingActions.map(action => ({ type: 'action', value: action })),
            ...matchingUsers.map(user => ({ type: 'user', value: user })),
            ...matchingPots.map(pot => ({ type: 'pot', value: pot }))
        );

        return {
            results: items,
            suggestions: suggestions.slice(0, 10) // Limit suggestions
        };
        
    } catch (error) {
        console.error('Search with suggestions failed:', error);
        return { results: [], suggestions: [] };
    }
};

// Get history for a specific user (useful for user profile pages)
export const getUserHistory = (userId, page = 1, limit = 20) => async (dispatch) => {
    return dispatch(getHistory(page, limit, { userId: userId.toString() }));
};

// Get history for a specific pot (useful for pot detail pages)
export const getPotHistory = (potId, page = 1, limit = 20) => async (dispatch) => {
    return dispatch(getHistory(page, limit, { potId: potId.toString() }));
};

// Get recent activity (last 24 hours)
export const getRecentActivity = (hours = 24) => async (dispatch) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);
    
    return dispatch(getHistory(1, 100, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
    }));
};

// Export data helper - now actually uses filters and fetches fresh data
export const exportHistoryData = (filters = {}, includeAllPages = true) => async (dispatch, getState) => {
    try {
        if (includeAllPages) {
            // Fetch all data for export by setting a high limit
            const exportFilters = {
                ...filters,
                // Remove pagination for export
                page: 1,
                limit: 10000 // Get up to 10k records for export
            };
            
            const queryParams = new URLSearchParams();
            Object.entries(exportFilters).forEach(([key, value]) => {
                if (value && value !== '') {
                    queryParams.append(key, value);
                }
            });

            const response = await csrfFetch(`/api/history?${queryParams.toString()}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ 
                    message: 'Failed to fetch export data' 
                }));
                throw new Error(errorData.message || 'Failed to fetch export data');
            }
            
            const data = await response.json();
            return data.history; // Return the full dataset
        } else {
            // Just export current page data with client-side filtering
            const state = getState();
            const { items } = state.history;
            
            // Apply client-side filters if any
            if (Object.keys(filters).length === 0) {
                return items;
            }
            
            return items.filter(item => {
                // Apply search filter
                if (filters.search) {
                    const searchLower = filters.search.toLowerCase();
                    const matchesSearch = 
                        item.description?.toLowerCase().includes(searchLower) ||
                        item.smartSummary?.toLowerCase().includes(searchLower) ||
                        item.smartDescription?.toLowerCase().includes(searchLower) ||
                        item.userPerformingAction?.firstName?.toLowerCase().includes(searchLower) ||
                        item.userPerformingAction?.lastName?.toLowerCase().includes(searchLower) ||
                        item.relatedPot?.name?.toLowerCase().includes(searchLower) ||
                        item.actionType?.toLowerCase().includes(searchLower);
                        
                    if (!matchesSearch) return false;
                }
                
                // Apply action type filter
                if (filters.actionType && item.actionType !== filters.actionType) {
                    return false;
                }
                
                // Apply category filter
                if (filters.category && item.category !== filters.category) {
                    return false;
                }
                
                // Apply priority filter
                if (filters.priority && item.priority !== filters.priority) {
                    return false;
                }
                
                // Apply date range filter
                if (filters.startDate || filters.endDate) {
                    const itemDate = new Date(item.createdAt);
                    
                    if (filters.startDate && itemDate < new Date(filters.startDate)) {
                        return false;
                    }
                    
                    if (filters.endDate && itemDate > new Date(filters.endDate)) {
                        return false;
                    }
                }
                
                // Apply user filter
                if (filters.userId && item.userId !== parseInt(filters.userId)) {
                    return false;
                }
                
                // Apply pot filter
                if (filters.potId && item.potIdContext !== parseInt(filters.potId)) {
                    return false;
                }
                
                return true;
            });
        }
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
};

// Initial state
const initialState = {
    items: [],
    isLoading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    statistics: {
        totalRecords: 0,
        financialActions: 0,
        totalAmount: 0,
        uniqueUsers: 0,
        uniquePots: 0,
        todayActions: 0,
        actionBreakdown: {},
        categoryBreakdown: {},
        priorityBreakdown: {}
    },
    statisticsLoading: false,
    statisticsError: null,
    lastFetchTime: null,
    filters: {
        search: '',
        actionType: '',
        entityType: '',
        userId: '',
        potId: '',
        startDate: '',
        endDate: '',
        category: '',
        priority: ''
    }
};

// Reducer
const historyReducer = (state = initialState, action) => {
    switch (action.type) {
        case FETCH_HISTORY_START:
            return { 
                ...state, 
                isLoading: true, 
                error: null 
            };
            
        case FETCH_HISTORY_SUCCESS:
            return {
                ...state,
                isLoading: false,
                items: action.payload.history || [],
                currentPage: action.payload.currentPage || 1,
                totalPages: action.payload.totalPages || 1,
                totalItems: action.payload.totalItems || 0,
                itemsPerPage: action.payload.itemsPerPage || 20,
                statistics: action.payload.statistics || state.statistics,
                lastFetchTime: new Date().toISOString(),
                error: null
            };
            
        case FETCH_HISTORY_FAILURE:
            return { 
                ...state, 
                isLoading: false, 
                error: action.payload,
                items: [] // Clear items on error to prevent stale data
            };
            
        case FETCH_STATISTICS_START:
            return {
                ...state,
                statisticsLoading: true,
                statisticsError: null
            };
            
        case FETCH_STATISTICS_SUCCESS:
            return {
                ...state,
                statisticsLoading: false,
                statistics: action.payload,
                statisticsError: null
            };
            
        case FETCH_STATISTICS_FAILURE:
            return {
                ...state,
                statisticsLoading: false,
                statisticsError: action.payload
            };
            
        case CLEAR_HISTORY:
            return {
                ...initialState
            };
            
        default:
            return state;
    }
};

// Selectors
export const selectHistoryItems = (state) => state.history.items;
export const selectHistoryLoading = (state) => state.history.isLoading;
export const selectHistoryError = (state) => state.history.error;
export const selectHistoryPagination = (state) => ({
    currentPage: state.history.currentPage,
    totalPages: state.history.totalPages,
    totalItems: state.history.totalItems,
    itemsPerPage: state.history.itemsPerPage
});
export const selectHistoryStatistics = (state) => state.history.statistics;
export const selectHistoryFilters = (state) => state.history.filters;

// Memoized selectors for computed data
export const selectFilteredHistoryItems = (state, filters) => {
    const items = selectHistoryItems(state);
    
    if (!filters || Object.keys(filters).length === 0) {
        return items;
    }
    
    return items.filter(item => {
        // Apply client-side filtering if needed
        // This is mainly for additional filtering that wasn't done server-side
        
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const matchesSearch = 
                item.description?.toLowerCase().includes(searchLower) ||
                item.smartSummary?.toLowerCase().includes(searchLower) ||
                item.userPerformingAction?.firstName?.toLowerCase().includes(searchLower) ||
                item.userPerformingAction?.lastName?.toLowerCase().includes(searchLower) ||
                item.relatedPot?.name?.toLowerCase().includes(searchLower);
                
            if (!matchesSearch) return false;
        }
        
        if (filters.priority && item.priority !== filters.priority) {
            return false;
        }
        
        if (filters.category && item.category !== filters.category) {
            return false;
        }
        
        return true;
    });
};

export const selectHistoryByDateRange = (state, startDate, endDate) => {
    const items = selectHistoryItems(state);
    
    if (!startDate && !endDate) return items;
    
    return items.filter(item => {
        const itemDate = new Date(item.createdAt);
        
        if (startDate && itemDate < new Date(startDate)) {
            return false;
        }
        
        if (endDate && itemDate > new Date(endDate)) {
            return false;
        }
        
        return true;
    });
};

export const selectFinancialHistory = (state) => {
    const items = selectHistoryItems(state);
    return items.filter(item => item.isFinancial);
};

export const selectRecentHistory = (state, hours = 24) => {
    const items = selectHistoryItems(state);
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    return items.filter(item => new Date(item.createdAt) > cutoffTime);
};

export const selectHistoryByUser = (state, userId) => {
    const items = selectHistoryItems(state);
    return items.filter(item => item.userId === userId);
};

export const selectHistoryByPot = (state, potId) => {
    const items = selectHistoryItems(state);
    return items.filter(item => item.potIdContext === potId);
};

// Action type constants for external use
export const ACTION_TYPES = {
    FETCH_HISTORY_START,
    FETCH_HISTORY_SUCCESS,
    FETCH_HISTORY_FAILURE,
    FETCH_STATISTICS_START,
    FETCH_STATISTICS_SUCCESS,
    FETCH_STATISTICS_FAILURE,
    CLEAR_HISTORY
};

export default historyReducer;