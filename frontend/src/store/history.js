// frontend/src/store/history.js
import { csrfFetch } from './csrf';

const FETCH_HISTORY_START = 'history/FETCH_HISTORY_START';
const FETCH_HISTORY_SUCCESS = 'history/FETCH_HISTORY_SUCCESS';
const FETCH_HISTORY_FAILURE = 'history/FETCH_HISTORY_FAILURE';

const fetchHistoryStart = () => ({ type: FETCH_HISTORY_START });
const fetchHistorySuccess = (data) => ({ type: FETCH_HISTORY_SUCCESS, payload: data });
const fetchHistoryFailure = (error) => ({ type: FETCH_HISTORY_FAILURE, payload: error });

export const getHistory = (page = 1, limit = 20) => async (dispatch) => {
    dispatch(fetchHistoryStart());
    try {
        const response = await csrfFetch(`/api/history?page=${page}&limit=${limit}`);
        if (!response.ok) throw response;
        const data = await response.json();
        dispatch(fetchHistorySuccess(data));
    } catch (error) {
        const errorData = await error.json().catch(() => ({ message: 'Failed to fetch history and parse error.' }));
        dispatch(fetchHistoryFailure(errorData));
    }
};

const initialState = {
    items: [],
    isLoading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
};

const historyReducer = (state = initialState, action) => {
    switch (action.type) {
        case FETCH_HISTORY_START:
            return { ...state, isLoading: true, error: null };
        case FETCH_HISTORY_SUCCESS:
            return {
                ...state,
                isLoading: false,
                items: action.payload.history,
                currentPage: action.payload.currentPage,
                totalPages: action.payload.totalPages,
            };
        case FETCH_HISTORY_FAILURE:
            return { ...state, isLoading: false, error: action.payload };
        default:
            return state;
    }
};

export default historyReducer;