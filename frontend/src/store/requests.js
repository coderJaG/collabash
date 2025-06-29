import { csrfFetch } from "./csrf";
import { toast } from "react-toastify";
import { getAPotById } from "./pots";

// --- ACTION TYPES ---
const CREATE_JOIN_REQUEST_START = 'requests/CREATE_JOIN_REQUEST_START';
const CREATE_JOIN_REQUEST_SUCCESS = 'requests/CREATE_JOIN_REQUEST_SUCCESS';
const CREATE_JOIN_REQUEST_FAILURE = 'requests/CREATE_JOIN_REQUEST_FAILURE';

const GET_RECEIVED_REQUESTS_START = 'requests/GET_RECEIVED_REQUESTS_START';
const GET_RECEIVED_REQUESTS_SUCCESS = 'requests/GET_RECEIVED_REQUESTS_SUCCESS';
const GET_RECEIVED_REQUESTS_FAILURE = 'requests/GET_RECEIVED_REQUESTS_FAILURE';

const GET_SENT_REQUESTS_START = 'requests/GET_SENT_REQUESTS_START';
const GET_SENT_REQUESTS_SUCCESS = 'requests/GET_SENT_REQUESTS_SUCCESS';
const GET_SENT_REQUESTS_FAILURE = 'requests/GET_SENT_REQUESTS_FAILURE';

const RESPOND_TO_REQUEST_START = 'requests/RESPOND_TO_REQUEST_START';
const RESPOND_TO_REQUEST_SUCCESS = 'requests/RESPOND_TO_REQUEST_SUCCESS'; 
const RESPOND_TO_REQUEST_FAILURE = 'requests/RESPOND_TO_REQUEST_FAILURE';


// --- ACTION CREATORS ---
const createJoinRequestStart = () => ({ type: CREATE_JOIN_REQUEST_START });
const createJoinRequestSuccess = (request) => ({ type: CREATE_JOIN_REQUEST_SUCCESS, payload: request });
const createJoinRequestFailure = (error) => ({ type: CREATE_JOIN_REQUEST_FAILURE, payload: error });

const getReceivedRequestsStart = () => ({ type: GET_RECEIVED_REQUESTS_START });
const getReceivedRequestsSuccess = (requests) => ({ type: GET_RECEIVED_REQUESTS_SUCCESS, payload: requests });
const getReceivedRequestsFailure = (error) => ({ type: GET_RECEIVED_REQUESTS_FAILURE, payload: error });

const getSentRequestsStart = () => ({ type: GET_SENT_REQUESTS_START });
const getSentRequestsSuccess = (requests) => ({ type: GET_SENT_REQUESTS_SUCCESS, payload: requests });
const getSentRequestsFailure = (error) => ({ type: GET_SENT_REQUESTS_FAILURE, payload: error });

const respondToRequestStart = (requestId) => ({ type: RESPOND_TO_REQUEST_START, payload: requestId });
const respondToRequestSuccess = () => ({ type: RESPOND_TO_REQUEST_SUCCESS });
const respondToRequestFailure = (error) => ({ type: RESPOND_TO_REQUEST_FAILURE, payload: error });


// --- THUNKS ---
export const createJoinRequest = (potId) => async (dispatch, getState) => {
    // ✅ NEW: Client-side check to prevent duplicate requests
    const { requests } = getState();
    const existingSentRequest = Object.values(requests.sentRequests).find(
        req => req.potId === potId && req.status === 'pending'
    );
    if (existingSentRequest) {
        toast.info("You already have a pending request for this pot.");
        return; // Stop the dispatch if request already exists
    }

    dispatch(createJoinRequestStart());
    try {
        const res = await csrfFetch('/api/requests', {
            method: 'POST',
            body: JSON.stringify({ potId })
        });
        const data = await res.json();
        if (!res.ok) throw data;
        
        dispatch(createJoinRequestSuccess(data));
        toast.success("Your request to join the pot has been sent!");
        dispatch(fetchSentRequests()); // Refresh the user's sent requests list
        return data;
    } catch (error) {
        const errorMessage = error.message || "Failed to send join request.";
        toast.error(errorMessage);
        dispatch(createJoinRequestFailure(errorMessage));
        throw error;
    }
};

export const fetchReceivedRequests = () => async (dispatch) => {
    dispatch(getReceivedRequestsStart());
    try {
        const res = await csrfFetch('/api/requests/received');
        if (!res.ok) throw await res.json();
        const data = await res.json();
        dispatch(getReceivedRequestsSuccess(data.JoinRequests));
    } catch (error) {
        const errorMessage = error.message || "Failed to fetch join requests.";
        dispatch(getReceivedRequestsFailure(errorMessage));
    }
};

export const fetchSentRequests = () => async (dispatch) => {
    dispatch(getSentRequestsStart());
    try {
        const res = await csrfFetch('/api/requests/sent');
        if (!res.ok) throw await res.json();
        const data = await res.json();
        dispatch(getSentRequestsSuccess(data.SentRequests));
    } catch (error) {
        const errorMessage = error.message || "Failed to fetch your sent requests.";
        dispatch(getSentRequestsFailure(errorMessage));
    }
};

export const respondToRequest = (requestId, status) => async (dispatch) => {
    dispatch(respondToRequestStart(requestId));
    try {
        const res = await csrfFetch(`/api/requests/${requestId}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (!res.ok) throw data;
        
        dispatch(respondToRequestSuccess());
        toast.success(`Request has been ${status}.`);
        dispatch(fetchReceivedRequests());

        if (status === 'approved' && data.potId) {
            dispatch(getAPotById(data.potId));
        }
        return data;
    } catch (error) {
        const errorMessage = error.message || "Failed to respond to request.";
        toast.error(errorMessage);
        dispatch(respondToRequestFailure(errorMessage));
        throw error;
    }
};


// --- REDUCER ---
const initialState = {
    isLoading: false,
    error: null,
    receivedRequests: {},
    sentRequests: {}, // Store sent requests by their ID for easy lookup
    loadingRequests: false,
    errorRequests: null
};

const requestsReducer = (state = initialState, action) => {
    switch (action.type) {
        case CREATE_JOIN_REQUEST_START:
            return { ...state, isLoading: true, error: null };
        case CREATE_JOIN_REQUEST_SUCCESS:
            // Add new request to the sentRequests state
            return { 
                ...state, 
                isLoading: false,
                sentRequests: { ...state.sentRequests, [action.payload.id]: action.payload }
            };
        case CREATE_JOIN_REQUEST_FAILURE:
            return { ...state, isLoading: false, error: action.payload };

        case GET_RECEIVED_REQUESTS_START:
            return { ...state, loadingRequests: true, errorRequests: null };
        case GET_RECEIVED_REQUESTS_SUCCESS: {
            const newRequests = {};
            action.payload.forEach(req => { newRequests[req.id] = req; });
            return { ...state, loadingRequests: false, receivedRequests: newRequests };
        }
        case GET_RECEIVED_REQUESTS_FAILURE:
            return { ...state, loadingRequests: false, errorRequests: action.payload };
        
        case GET_SENT_REQUESTS_START:
            return { ...state, loadingRequests: true, errorRequests: null };
        case GET_SENT_REQUESTS_SUCCESS: {
            const newRequests = {};
            action.payload.forEach(req => { newRequests[req.id] = req; });
            return { ...state, loadingRequests: false, sentRequests: newRequests };
        }
        case GET_SENT_REQUESTS_FAILURE:
            return { ...state, loadingRequests: false, errorRequests: action.payload };

        case RESPOND_TO_REQUEST_START:
            return { ...state, isLoading: true }; 
        case RESPOND_TO_REQUEST_SUCCESS:
            return { ...state, isLoading: false };
        case RESPOND_TO_REQUEST_FAILURE:
            return { ...state, isLoading: false, error: action.payload };

        default:
            return state;
    }
};

export default requestsReducer;
