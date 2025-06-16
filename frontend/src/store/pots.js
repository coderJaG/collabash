// pots.js
import { csrfFetch } from "./csrf";
import { removeTransaction } from "./transactions";

// --- Action Types ---
export const GET_ALL_POTS_START = 'pots/GET_ALL_POTS_START';
export const GET_ALL_POTS_SUCCESS = 'pots/GET_ALL_POTS_SUCCESS';
export const GET_ALL_POTS_FAILURE = 'pots/GET_ALL_POTS_FAILURE';

export const GET_POT_BY_ID_START = 'pots/GET_POT_BY_ID_START';
export const GET_POT_BY_ID_SUCCESS = 'pots/GET_POT_BY_ID_SUCCESS';
export const GET_POT_BY_ID_FAILURE = 'pots/GET_POT_BY_ID_FAILURE';
export const CLEAR_POT_DETAILS_ERROR = 'pots/CLEAR_POT_DETAILS_ERROR';

export const CREATE_POT_START = 'pots/CREATE_POT_START';
export const CREATE_POT_SUCCESS = 'pots/CREATE_POT_SUCCESS';
export const CREATE_POT_FAILURE = 'pots/CREATE_POT_FAILURE';


export const UPDATE_POT_OPTIMISTIC = 'pots/UPDATE_POT_OPTIMISTIC';
export const UPDATE_POT_SUCCESS = 'pots/UPDATE_POT_SUCCESS';
export const UPDATE_POT_FAILURE = 'pots/UPDATE_POT_FAILURE';


export const DELETE_POT_OPTIMISTIC = 'pots/DELETE_POT_OPTIMISTIC';
export const DELETE_POT_SUCCESS = 'pots/DELETE_POT_SUCCESS';
export const DELETE_POT_FAILURE = 'pots/DELETE_POT_FAILURE';
export const RESET_DELETE_POT_STATUS = 'pots/RESET_DELETE_POT_STATUS';


export const ADD_USER_TO_POT_OPTIMISTIC = 'pots/ADD_USER_TO_POT_OPTIMISTIC';
export const ADD_USER_TO_POT_SUCCESS = 'pots/ADD_USER_TO_POT_SUCCESS';
export const ADD_USER_TO_POT_FAILURE = 'pots/ADD_USER_TO_POT_FAILURE';


export const REMOVE_USER_FROM_POT_OPTIMISTIC = 'pots/REMOVE_USER_FROM_POT_OPTIMISTIC';
export const REMOVE_USER_FROM_POT_SUCCESS = 'pots/REMOVE_USER_FROM_POT_SUCCESS';
export const REMOVE_USER_FROM_POT_FAILURE = 'pots/REMOVE_USER_FROM_POT_FAILURE';


export const REORDER_POT_USERS_OPTIMISTIC = 'pots/REORDER_POT_USERS_OPTIMISTIC';
export const REORDER_POT_USERS_SUCCESS = 'pots/REORDER_POT_USERS_SUCCESS';
export const REORDER_POT_USERS_FAILURE = 'pots/REORDER_POT_USERS_FAILURE';
export const CLEAR_POT_REORDER_ERROR = 'pots/CLEAR_POT_REORDER_ERROR';


// --- Action Creators ---

const getAllPotsStart = () => ({ type: GET_ALL_POTS_START });
const getAllPotsSuccess = (pots) => ({ type: GET_ALL_POTS_SUCCESS, payload: pots });
const getAllPotsFailure = (error) => ({ type: GET_ALL_POTS_FAILURE, payload: error });

const getPotByIdStart = () => ({ type: GET_POT_BY_ID_START });
const getPotByIdSuccess = (pot) => ({ type: GET_POT_BY_ID_SUCCESS, payload: pot });
const getPotByIdFailure = (error) => ({ type: GET_POT_BY_ID_FAILURE, payload: error });
export const clearPotDetailsError = () => ({ type: CLEAR_POT_DETAILS_ERROR });

const createPotStart = () => ({ type: CREATE_POT_START });
const createPotSuccess = (pot) => ({ type: CREATE_POT_SUCCESS, payload: pot });
const createPotFailure = (error) => ({ type: CREATE_POT_FAILURE, payload: error });


const updatePotOptimistic = (potData, potId) => ({ type: UPDATE_POT_OPTIMISTIC, payload: { potData, potId } });
const updatePotSuccess = (pot) => ({ type: UPDATE_POT_SUCCESS, payload: pot });
const updatePotFailure = (error) => ({ type: UPDATE_POT_FAILURE, payload: error });


const deletePotOptimistic = (potId) => ({ type: DELETE_POT_OPTIMISTIC, payload: potId });
const deletePotSuccess = (potId) => ({ type: DELETE_POT_SUCCESS, payload: potId });
const deletePotFailure = (error) => ({ type: DELETE_POT_FAILURE, payload: error });
export const resetDeletePotStatus = () => ({ type: RESET_DELETE_POT_STATUS });


const addUserToPotOptimistic = (potData) => ({ type: ADD_USER_TO_POT_OPTIMISTIC, payload: potData });
const addUserToPotSuccess = (pot) => ({ type: ADD_USER_TO_POT_SUCCESS, payload: pot });
const addUserToPotFailure = (error) => ({ type: ADD_USER_TO_POT_FAILURE, payload: error });


const removeUserFromPotOptimistic = (potData) => ({ type: REMOVE_USER_FROM_POT_OPTIMISTIC, payload: potData });
const removeUserFromPotSuccess = (pot) => ({ type: REMOVE_USER_FROM_POT_SUCCESS, payload: pot });
const removeUserFromPotFailure = (error) => ({ type: REMOVE_USER_FROM_POT_FAILURE, payload: error });


const reorderPotUsersOptimistic = (potId, orderedUsers) => ({ type: REORDER_POT_USERS_OPTIMISTIC, payload: { potId, orderedUsers } });
const reorderPotUsersSuccess = (updatedPot) => ({ type: REORDER_POT_USERS_SUCCESS, payload: updatedPot });
const reorderPotUsersFailure = (error) => ({ type: REORDER_POT_USERS_FAILURE, payload: error });
export const clearPotReorderError = () => ({ type: CLEAR_POT_REORDER_ERROR });


// Helper to process error responses
const processErrorResponse = async (response, defaultMessage) => {
    let errorData = { status: response.status, message: defaultMessage, errors: [] };
    try {
        const backendError = await response.json();
        errorData = { ...errorData, ...backendError };
        if (typeof errorData.message === 'object' && errorData.message !== null) {
            errorData.message = errorData.message.detail || errorData.message.error || JSON.stringify(errorData.message);
        } else if (!errorData.message) {
            errorData.message = response.statusText || defaultMessage;
        }
    } catch (e) {
        errorData.message = response.statusText || defaultMessage;
    }
    if (typeof errorData.message !== 'string') {
        errorData.message = String(errorData.message || defaultMessage);
    }
    return errorData;
};

// Helper to check for network error
const isNetworkError = (error) => {
    return !error.status; // Network errors from fetch don't have a status property
};

// --- Thunks ---

export const getPots = () => async (dispatch) => {
    dispatch(getAllPotsStart());
    try {
        const res = await csrfFetch('/api/pots');
        if (!res.ok) throw await processErrorResponse(res, 'Failed to fetch pots');
        const data = await res.json();
        dispatch(getAllPotsSuccess(data));
    } catch (error) {
        dispatch(getAllPotsFailure(error));
    }
};

export const getAPotById = (potId) => async (dispatch) => {
    dispatch(getPotByIdStart());
    try {
        const res = await csrfFetch(`/api/pots/${potId}`);
        if (!res.ok) throw await processErrorResponse(res, `Failed to fetch pot ${potId}`);
        const data = await res.json();
        dispatch(getPotByIdSuccess(data));
    } catch (error) {
        dispatch(getPotByIdFailure(error));
    }
};


export const createAPot = (potData) => async (dispatch) => {
    dispatch(createPotStart());
    try {
        const res = await csrfFetch('/api/pots', {
            method: 'POST',
            body: JSON.stringify(potData),
        });
        if (!res.ok) throw await processErrorResponse(res, 'Failed to create pot');
        const data = await res.json();
        dispatch(createPotSuccess(data));
        return data;
    } catch (error) {
        dispatch(createPotFailure(error));
        if (!isNetworkError(error)) throw error;
    }
};


export const updateAPot = (potData, potId) => async (dispatch) => {
    dispatch(updatePotOptimistic(potData, potId));
    try {
        const res = await csrfFetch(`/api/pots/${potId}`, {
            method: 'PUT',
            body: JSON.stringify(potData),
        });
        if (!res.ok) throw await processErrorResponse(res, `Failed to update pot ${potId}`);
        const data = await res.json();
        dispatch(updatePotSuccess(data));
        return data;
    } catch (error) {
        if (!isNetworkError(error)) {
            dispatch(updatePotFailure(error));
            throw error;
        }
        console.warn('Pot update failed, likely offline. Background sync will handle it.');
    }
};


export const deletePot = (potId) => async (dispatch) => {
    dispatch(deletePotOptimistic(potId));
    try {
        const res = await csrfFetch(`/api/pots/${potId}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw await processErrorResponse(res, `Failed to delete pot ${potId}`);
        dispatch(deletePotSuccess(potId));
    } catch (error) {
        if (!isNetworkError(error)) {
            dispatch(deletePotFailure(error));
        }
        console.warn('Pot delete failed, likely offline. Background sync will handle it.');
    }
};


export const addUserToPot = (userData) => async (dispatch) => {
    dispatch(addUserToPotOptimistic(userData));
    try {
        const { potId, userId } = userData;
        const res = await csrfFetch(`/api/pots/${potId}/addusers`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
        if (!res.ok) throw await processErrorResponse(res, `Failed to add user`);
        const data = await res.json();
        dispatch(addUserToPotSuccess(data));
        return data;
    } catch (error) {
        if (!isNetworkError(error)) {
            dispatch(addUserToPotFailure(error));
            throw error;
        }
        console.warn('Add user failed, likely offline. Background sync will handle it.');
    }
};


export const removeUserFromPot = (userData) => async (dispatch) => {
    dispatch(removeUserFromPotOptimistic(userData));
    try {
        const { potId, userId } = userData;
        const res = await csrfFetch(`/api/pots/${potId}/removeusers`, {
            method: 'DELETE',
            body: JSON.stringify({ userId }),
        });
        if (!res.ok) throw await processErrorResponse(res, `Failed to remove user`);
        const data = await res.json();
        dispatch(removeUserFromPotSuccess(data));
        dispatch(removeTransaction(potId, userId));
        return data;
    } catch (error) {
        if (!isNetworkError(error)) {
            dispatch(removeUserFromPotFailure(error));
            throw error;
        }
        console.warn('Remove user failed, likely offline. Background sync will handle it.');
    }
};


export const reorderPotUsers = (potId, orderedUserIds) => async (dispatch, getState) => {
    const { pots } = getState();
    const originalUsers = pots.currentPotDetails.Users;
    const optimisticallyUpdatedUsers = orderedUserIds.map((id, index) => {
        const user = originalUsers.find(u => u.id === id);
        return { ...user, potMemberDetails: { ...user.potMemberDetails, displayOrder: index + 1 } };
    });

    dispatch(reorderPotUsersOptimistic(potId, optimisticallyUpdatedUsers));

    try {
        const res = await csrfFetch(`/api/pots/${potId}/reorderusers`, {
            method: 'PUT',
            body: JSON.stringify({ orderedUserIds }),
        });
        if (!res.ok) throw await processErrorResponse(res, `Failed to reorder users`);
        const updatedPot = await res.json();
        dispatch(reorderPotUsersSuccess(updatedPot));
        return updatedPot;
    } catch (error) {
        if (!isNetworkError(error)) {
            dispatch(reorderPotUsersFailure(error));
        }
        console.warn('Reorder users failed, likely offline. Background sync will handle it.');
    }
};



const initialState = {
    allById: {},
    currentPotDetails: null,
    isLoadingList: false,
    errorList: null,
    isLoadingDetails: false,
    errorDetails: null,
    isCreating: false,
    errorCreate: null,
    isUpdating: false,
    errorUpdate: null,
    isReorderingPotUsers: false, 
    errorReorderingPotUsers: null,
    isDeleting: false,
    errorDelete: null,
    deletePotSuccess: false,
    addUserStatus: null,
    removeUserStatus: null
};
// --- Reducer ---

const potsReducer = (state = initialState, action) => {
    let newState;
    let potId;
    // let userId;

    switch (action.type) {

        // Optimistic update cases
        case UPDATE_POT_OPTIMISTIC: {
            const { potData, potId } = action.payload;
            const updatedPot = { ...state.allById[potId], ...potData };
            return {
                ...state,
                allById: { ...state.allById, [potId]: updatedPot },
                currentPotDetails: (state.currentPotDetails && state.currentPotDetails.id === potId) ? { ...state.currentPotDetails, ...potData } : state.currentPotDetails
            };
        }

        case DELETE_POT_OPTIMISTIC: {
            potId = action.payload;
            newState = { ...state, allById: { ...state.allById } };
            delete newState.allById[potId];
            if (newState.currentPotDetails && newState.currentPotDetails.id === potId) {
                newState.currentPotDetails = null;
            }
            return newState;
        }

        case ADD_USER_TO_POT_OPTIMISTIC:
        case REMOVE_USER_FROM_POT_OPTIMISTIC:
        case REORDER_POT_USERS_OPTIMISTIC: {
            const { potId, orderedUsers } = action.payload;
            const potToUpdate = state.allById[potId];
            if (potToUpdate) {
                const updatedPot = { ...potToUpdate, Users: orderedUsers };
                return {
                    ...state,
                    allById: { ...state.allById, [potId]: updatedPot },
                    currentPotDetails: (state.currentPotDetails && state.currentPotDetails.id === potId) ? updatedPot : state.currentPotDetails,
                };
            }
            return state;
        }


        case CREATE_POT_SUCCESS:
        case UPDATE_POT_SUCCESS:
        case ADD_USER_TO_POT_SUCCESS:
        case REMOVE_USER_FROM_POT_SUCCESS:
        case REORDER_POT_USERS_SUCCESS:
            return {
                ...state,
                isUpdating: false,
                isCreating: false,
                isReorderingPotUsers: false,
                allById: { ...state.allById, [action.payload.id]: action.payload },
                currentPotDetails: (state.currentPotDetails && state.currentPotDetails.id === action.payload.id) ? action.payload : state.currentPotDetails,
            };

        // Failure cases might need to revert state, for now just reset loading flags
        case CREATE_POT_FAILURE:
            return { ...state, isCreating: false, errorCreate: action.payload };
        case UPDATE_POT_FAILURE:
            return { ...state, isUpdating: false, errorUpdate: action.payload };
        case ADD_USER_TO_POT_FAILURE:
            return { ...state, isUpdating: false, errorUpdate: action.payload };
        case REMOVE_USER_FROM_POT_FAILURE:
            return { ...state, isUpdating: false, errorUpdate: action.payload };
        case REORDER_POT_USERS_FAILURE:
            return { ...state, isReorderingPotUsers: false, errorReorderingPotUsers: action.payload };
        case DELETE_POT_FAILURE:
            return { ...state, isDeleting: false, errorDelete: action.payload };

        // Standard GET and DELETE logic
        case GET_ALL_POTS_START:
            return { ...state, isLoadingList: true, errorList: null };
        case GET_ALL_POTS_SUCCESS: {
            const newAllById = {};
            if (action.payload && action.payload.Pots) {
                action.payload.Pots.forEach(pot => { newAllById[pot.id] = pot; });
            }
            return { ...state, isLoadingList: false, allById: newAllById, errorList: null };
        }
        case GET_ALL_POTS_FAILURE:
            return { ...state, isLoadingList: false, errorList: action.payload };
        case GET_POT_BY_ID_START:
            return { ...state, isLoadingDetails: true, errorDetails: null, currentPotDetails: null };
        case GET_POT_BY_ID_SUCCESS:
            return { ...state, isLoadingDetails: false, currentPotDetails: action.payload, errorDetails: null };
        case GET_POT_BY_ID_FAILURE:
            return { ...state, isLoadingDetails: false, errorDetails: action.payload };
        case CLEAR_POT_DETAILS_ERROR:
            return { ...state, errorDetails: null };
        case DELETE_POT_SUCCESS:
            return { ...state, isDeleting: false, deletePotSuccess: true };
        case RESET_DELETE_POT_STATUS:
            return { ...state, deletePotSuccess: false };
        case CLEAR_POT_REORDER_ERROR:
            return { ...state, errorReorderingPotUsers: null };

        default:
            return state;
    }
};

export default potsReducer;