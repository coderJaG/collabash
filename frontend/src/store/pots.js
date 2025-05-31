import { csrfFetch } from "./csrf";
import { removeTransaction } from "./transactions";


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

export const UPDATE_POT_START = 'pots/UPDATE_POT_START';
export const UPDATE_POT_SUCCESS = 'pots/UPDATE_POT_SUCCESS';
export const UPDATE_POT_FAILURE = 'pots/UPDATE_POT_FAILURE';

export const DELETE_POT_START = 'pots/DELETE_POT_START';
export const DELETE_POT_SUCCESS = 'pots/DELETE_POT_SUCCESS';
export const DELETE_POT_FAILURE = 'pots/DELETE_POT_FAILURE';
export const RESET_DELETE_POT_STATUS = 'pots/RESET_DELETE_POT_STATUS'


const ADD_USER_TO_POT_START = 'pots/ADD_USER_TO_POT_START';
const ADD_USER_TO_POT_SUCCESS = 'pots/ADD_USER_TO_POT_SUCCESS';
const ADD_USER_TO_POT_FAILURE = 'pots/ADD_USER_TO_POT_FAILURE';

const REMOVE_USER_FROM_POT_START = 'pots/REMOVE_USER_FROM_POT_START';
const REMOVE_USER_FROM_POT_SUCCESS = 'pots/REMOVE_USER_FROM_POT_SUCCESS';
const REMOVE_USER_FROM_POT_FAILURE = 'pots/REMOVE_USER_FROM_POT_FAILURE';

// New Action Types for Reordering Users
export const REORDER_POT_USERS_START = 'pots/REORDER_POT_USERS_START';
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

const updatePotStart = () => ({ type: UPDATE_POT_START });
const updatePotSuccess = (pot) => ({ type: UPDATE_POT_SUCCESS, payload: pot });
const updatePotFailure = (error) => ({ type: UPDATE_POT_FAILURE, payload: error });

const deletePotStart = () => ({ type: DELETE_POT_START });
const deletePotSuccess = (potId) => ({ type: DELETE_POT_SUCCESS, payload: potId });
const deletePotFailure = (error) => ({ type: DELETE_POT_FAILURE, payload: error });
export const resetDeletePotStatus = () => ({ type: RESET_DELETE_POT_STATUS })

const addUserToPotStart = () => ({ type: ADD_USER_TO_POT_START });
const addUserToPotSuccess = (potUserData) => ({ type: ADD_USER_TO_POT_SUCCESS, payload: potUserData });
const addUserToPotFailure = (error) => ({ type: ADD_USER_TO_POT_FAILURE, payload: error });

const removeUserFromPotStart = () => ({ type: REMOVE_USER_FROM_POT_START });
const removeUserFromPotSuccess = (potUserData) => ({ type: REMOVE_USER_FROM_POT_SUCCESS, payload: potUserData });
const removeUserFromPotFailure = (error) => ({ type: REMOVE_USER_FROM_POT_FAILURE, payload: error });

// New Action Creators for Reordering
const reorderPotUsersStart = () => ({ type: REORDER_POT_USERS_START });
const reorderPotUsersSuccess = (updatedPot) => ({ type: REORDER_POT_USERS_SUCCESS, payload: updatedPot });
const reorderPotUsersFailure = (error) => ({ type: REORDER_POT_USERS_FAILURE, payload: error });
export const clearPotReorderError = () => ({ type: CLEAR_POT_REORDER_ERROR });


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
    isReorderingPotUsers: false, // Specific for reorder operation
    errorReorderingPotUsers: null,
    isDeleting: false,
    errorDelete: null,
    deletePotSuccess: false,
    addUserStatus: null,
    removeUserStatus: null
};

// Helper to process error responses and ensure error.message is a string
const processErrorResponse = async (response, defaultMessage) => {
    let errorData = {
        status: response.status, // Capture status from the Response object
        message: defaultMessage, // Start with a default message
        errors: [] // For potential validation errors array from backend
    };
    try {
        const backendError = await response.json(); // Attempt to parse backend error
        // Merge backendError properties; backendError might overwrite default message or status if provided
        errorData = { ...errorData, ...backendError };

      
        if (typeof errorData.message === 'object' && errorData.message !== null) {
            // If backendError.message is an object, try to find a detail or stringify it
            errorData.message = errorData.message.detail || errorData.message.error || JSON.stringify(errorData.message);
        } else if (!errorData.message) { // If message is null, undefined, or empty after merge
            errorData.message = response.statusText || defaultMessage; // Fallback to statusText or default
        }
    } catch (e) {
        // JSON parsing failed, use statusText or defaultMessage already in errorData
        errorData.message = response.statusText || defaultMessage;
        console.warn("Could not parse JSON error response, using status text/default message:", e);
    }
    // Final check to ensure message is a string
    if (typeof errorData.message !== 'string') {
        errorData.message = String(errorData.message || defaultMessage);
    }
    return errorData;
};


// --- Thunks ---

export const getPots = () => async (dispatch) => {
    dispatch(getAllPotsStart());
    try {
        const res = await csrfFetch('/api/pots');
        if (!res.ok) {
            // If res.ok is false, processErrorResponse will create a structured error object to be thrown
            throw await processErrorResponse(res, 'Failed to fetch pots');
        }
        const data = await res.json();
        dispatch(getAllPotsSuccess(data));
    } catch (caughtError) {
        let errorToDispatch;
        if (caughtError instanceof Response) {
            // This case handles if csrfFetch itself throws the raw Response (e.g., network error before !res.ok)
            // or if processErrorResponse was somehow bypassed and raw Response was thrown.
            errorToDispatch = await processErrorResponse(caughtError, 'Failed to fetch pots (processed in catch)');
        } else {
            // Assumes caughtError is already a structured error object (from processErrorResponse)
            // or a standard JavaScript Error object.
            errorToDispatch = {
                message: caughtError.message || String(caughtError) || 'An unknown error occurred while fetching pots.',
                status: caughtError.status, // Preserve status if it exists
                ...(typeof caughtError === 'object' && caughtError !== null ? caughtError : {})
            };
        }
        dispatch(getAllPotsFailure(errorToDispatch));
    }
};

export const getAPotById = (potId) => async (dispatch) => {
    dispatch(getPotByIdStart());
    try {
        const res = await csrfFetch(`/api/pots/${potId}`);
        if (!res.ok) {
            throw await processErrorResponse(res, `Failed to fetch pot ${potId}`);
        }
        const data = await res.json();
        dispatch(getPotByIdSuccess(data));
    } catch (caughtError) {
        console.error(`Error fetching pot ${potId}:`, caughtError);
        let errorToDispatch;
        if (caughtError instanceof Response) {
            errorToDispatch = await processErrorResponse(caughtError, `Failed to fetch pot ${potId} (processed in catch)`);
        } else {
            errorToDispatch = {
                message: caughtError.message || String(caughtError) || `An unknown error occurred while fetching pot ${potId}.`,
                status: caughtError.status,
                ...(typeof caughtError === 'object' && caughtError !== null ? caughtError : {})
            };
        }
        dispatch(getPotByIdFailure(errorToDispatch));
    }
};

export const createNewPot = (potData) => async (dispatch) => {
    dispatch(createPotStart());
    try {
        const res = await csrfFetch('/api/pots', {
            method: 'POST',
            body: JSON.stringify(potData),
        });
        if (!res.ok) {
            throw await processErrorResponse(res, 'Failed to create pot');
        }
        const data = await res.json();
        dispatch(createPotSuccess(data));
        return data;
    } catch (caughtError) {
        let errorToDispatch;
        if (caughtError instanceof Response) {
            errorToDispatch = await processErrorResponse(caughtError, 'Failed to create pot (processed in catch)');
        } else {
            errorToDispatch = {
                message: caughtError.message || String(caughtError) || 'An unknown error occurred while creating the pot.',
                status: caughtError.status,
                ...(typeof caughtError === 'object' && caughtError !== null ? caughtError : {})
            };
        }
        dispatch(createPotFailure(errorToDispatch));
        throw errorToDispatch; // Re-throw for component to potentially handle
    }
};

export const updateAPot = (potData, potId) => async (dispatch) => {
    dispatch(updatePotStart());
    try {
        const res = await csrfFetch(`/api/pots/${potId}`, {
            method: 'PUT',
            body: JSON.stringify(potData),
        });
        if (!res.ok) {
            throw await processErrorResponse(res, `Failed to update pot ${potId}`);
        }
        const data = await res.json();
        dispatch(updatePotSuccess(data));
        return data;
    } catch (caughtError) {
        let errorToDispatch;
        if (caughtError instanceof Response) {
            errorToDispatch = await processErrorResponse(caughtError, `Failed to update pot ${potId} (processed in catch)`);
        } else {
            errorToDispatch = {
                message: caughtError.message || String(caughtError) || `An unknown error occurred while updating pot ${potId}.`,
                status: caughtError.status,
                ...(typeof caughtError === 'object' && caughtError !== null ? caughtError : {})
            };
        }
        dispatch(updatePotFailure(errorToDispatch));
        throw errorToDispatch;
    }
};

export const deletePot = (potId) => async (dispatch) => {
    dispatch(deletePotStart());
    try {
        const res = await csrfFetch(`/api/pots/${potId}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            throw await processErrorResponse(res, `Failed to delete pot ${potId}`);
        }
        dispatch(deletePotSuccess(potId));
        return res; // Or a success object like { message: "Successfully deleted" }
    } catch (caughtError) {
        let errorToDispatch;
        if (caughtError instanceof Response) {
            errorToDispatch = await processErrorResponse(caughtError, `Failed to delete pot ${potId} (processed in catch)`);
        } else {
            errorToDispatch = {
                message: caughtError.message || String(caughtError) || `An unknown error occurred while deleting pot ${potId}.`,
                status: caughtError.status,
                ...(typeof caughtError === 'object' && caughtError !== null ? caughtError : {})
            };
        }
        dispatch(deletePotFailure(errorToDispatch));
        // throw errorToDispatch; // Optional: re-throw if component needs to react
    }
};

export const addUserToPot = (userData) => async (dispatch) => {
    const { potId, userId } = userData;
    dispatch(addUserToPotStart());
    try {
        const res = await csrfFetch(`/api/pots/${potId}/addusers`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
        if (!res.ok) {
            throw await processErrorResponse(res, `Failed to add user ${userId} to pot ${potId}`);
        }
        const data = await res.json();
        dispatch(addUserToPotSuccess({ message: data.message || 'User added successfully', userId, potId }));
        dispatch(getAPotById(potId));
        return data;
    } catch (caughtError) {
        let errorToDispatch;
        if (caughtError instanceof Response) {
            errorToDispatch = await processErrorResponse(caughtError, `Failed to add user (processed in catch)`);
        } else {
            errorToDispatch = {
                message: caughtError.message || String(caughtError) || 'An unknown error occurred while adding user.',
                status: caughtError.status,
                ...(typeof caughtError === 'object' && caughtError !== null ? caughtError : {})
            };
        }
        dispatch(addUserToPotFailure(errorToDispatch));
        throw errorToDispatch;
    }
};

export const removeUserFromPot = (userData) => async (dispatch) => {
    const { potId, userId } = userData;
    dispatch(removeUserFromPotStart());
    try {
        const res = await csrfFetch(`/api/pots/${potId}/removeusers`, {
            method: 'DELETE',
            body: JSON.stringify({ userId }),
        });
        if (!res.ok) {
            throw await processErrorResponse(res, `Failed to remove user ${userId} from pot ${potId}`);
        }
        const data = await res.json();
        dispatch(removeUserFromPotSuccess({ message: data.message || 'User removed successfully', userId, potId }));
        dispatch(removeTransaction(potId, userId));
        dispatch(getAPotById(potId));
        return data;
    } catch (caughtError) {
        let errorToDispatch;
        if (caughtError instanceof Response) {
            errorToDispatch = await processErrorResponse(caughtError, `Failed to remove user (processed in catch)`);
        } else {
            errorToDispatch = {
                message: caughtError.message || String(caughtError) || 'An unknown error occurred while removing user.',
                status: caughtError.status,
                ...(typeof caughtError === 'object' && caughtError !== null ? caughtError : {})
            };
        }
        dispatch(removeUserFromPotFailure(errorToDispatch));
        throw errorToDispatch;
    }
};

// New Thunk for Reordering Users
export const reorderPotUsers = (potId, orderedUserIds) => async (dispatch) => {
    dispatch(reorderPotUsersStart());
    try {
        const res = await csrfFetch(`/api/pots/${potId}/reorderusers`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderedUserIds }),
        });
        if (!res.ok) {
            throw await processErrorResponse(res, `Failed to reorder users for pot ${potId}`);
        }
        const updatedPot = await res.json(); // Backend returns the full updated pot
        dispatch(reorderPotUsersSuccess(updatedPot)); // Updates currentPotDetails and allById
        
        return updatedPot;
    } catch (caughtError) {
        let errorToDispatch;
        if (caughtError instanceof Response) {
            errorToDispatch = await processErrorResponse(caughtError, `Failed to reorder users (processed in catch)`);
        } else {
            errorToDispatch = {
                message: caughtError.message || String(caughtError) || 'An unknown error occurred while reordering users.',
                status: caughtError.status,
                errors: caughtError.errors,
                ...(typeof caughtError === 'object' && caughtError !== null ? caughtError : {})
            };
        }
        dispatch(reorderPotUsersFailure(errorToDispatch));
        throw errorToDispatch; // Re-throw for component to handle
    }
};


// -- reducer --

const potsReducer = (state = initialState, action) => {
    let newState;
    let potIdToRemove;

    switch (action.type) {
        // Get All Pots
        case GET_ALL_POTS_START:
            return { ...state, isLoadingList: true, errorList: null };
        case GET_ALL_POTS_SUCCESS:
            const newAllById = {};
            if (action.payload && action.payload.Pots) {
                action.payload.Pots.forEach(pot => {
                    newAllById[pot.id] = pot;
                });
            }
            return { ...state, isLoadingList: false, allById: newAllById, errorList: null };
        case GET_ALL_POTS_FAILURE:
            return { ...state, isLoadingList: false, errorList: action.payload };

        // Get Pot By ID
        case GET_POT_BY_ID_START:
            return { ...state, isLoadingDetails: true, errorDetails: null, currentPotDetails: null };
        case GET_POT_BY_ID_SUCCESS:
            return { ...state, isLoadingDetails: false, currentPotDetails: action.payload, errorDetails: null };
        case GET_POT_BY_ID_FAILURE:
            return { ...state, isLoadingDetails: false, errorDetails: action.payload };
        case CLEAR_POT_DETAILS_ERROR:
            return { ...state, errorDetails: null };

        // Create Pot
        case CREATE_POT_START:
            return { ...state, isCreating: true, errorCreate: null };
        case CREATE_POT_SUCCESS:
            return {
                ...state,
                isCreating: false,
                allById: { ...state.allById, [action.payload.id]: action.payload },
                currentPotDetails: action.payload,
                errorCreate: null
            };
        case CREATE_POT_FAILURE:
            return { ...state, isCreating: false, errorCreate: action.payload };

        // Update Pot
        case UPDATE_POT_START:
            return { ...state, isUpdating: true, errorUpdate: null };
        case UPDATE_POT_SUCCESS:
            return {
                ...state,
                isUpdating: false,
                allById: { ...state.allById, [action.payload.id]: action.payload },
                currentPotDetails: (state.currentPotDetails && state.currentPotDetails.id === action.payload.id)
                    ? action.payload
                    : state.currentPotDetails,
                errorUpdate: null
            };
        case UPDATE_POT_FAILURE:
            return { ...state, isUpdating: false, errorUpdate: action.payload };

        // Add User to Pot
        case ADD_USER_TO_POT_START:
            return { ...state, isUpdating: true, errorUpdate: null, addUserStatus: null };
        case ADD_USER_TO_POT_SUCCESS:
            return {
                ...state,
                isUpdating: false,
                addUserStatus: {
                    success: true,
                    message: action.payload.message,
                    userId: action.payload.userId,
                    potId: action.payload.potId
                },
                errorUpdate: null
            };
        case ADD_USER_TO_POT_FAILURE:
            return {
                ...state,
                isUpdating: false,
                errorUpdate: action.payload,
                addUserStatus: { success: false, ...action.payload }
            };

        // Remove User from Pot
        case REMOVE_USER_FROM_POT_START:
            return { ...state, isUpdating: true, errorUpdate: null, removeUserStatus: null };
        case REMOVE_USER_FROM_POT_SUCCESS:
            return {
                ...state,
                isUpdating: false,
                removeUserStatus: {
                    success: true,
                    message: action.payload.message,
                    userId: action.payload.userId,
                    potId: action.payload.potId
                },
                errorUpdate: null
            };
        case REMOVE_USER_FROM_POT_FAILURE:
            return {
                ...state,
                isUpdating: false,
                errorUpdate: action.payload,
                removeUserStatus: { success: false, ...action.payload }
            };

        // Reducer cases for Reordering Users
        case REORDER_POT_USERS_START:
            return { ...state, isReorderingPotUsers: true, errorReorderingPotUsers: null };
        case REORDER_POT_USERS_SUCCESS:
            return {
                ...state,
                isReorderingPotUsers: false,
                currentPotDetails: action.payload, 
                allById: { ...state.allById, [action.payload.id]: action.payload },
                errorReorderingPotUsers: null
            };
        case REORDER_POT_USERS_FAILURE:
            return { ...state, isReorderingPotUsers: false, errorReorderingPotUsers: action.payload };
        case CLEAR_POT_REORDER_ERROR:
            return { ...state, errorReorderingPotUsers: null };

        // Delete Pot
        case DELETE_POT_START:
            return { ...state, isDeleting: true, errorDelete: null };
        case DELETE_POT_SUCCESS:
            potIdToRemove = action.payload;
            newState = {
                ...state,
                isDeleting: false,
                allById: { ...state.allById },
                deletePotSuccess: true,
                errorDelete: null
            };
            delete newState.allById[potIdToRemove];
            if (state.currentPotDetails && state.currentPotDetails.id === potIdToRemove) {
                newState.currentPotDetails = null;
            }
            return newState;
        case DELETE_POT_FAILURE:
            return { ...state, isDeleting: false, errorDelete: action.payload };
        case RESET_DELETE_POT_STATUS:
            return {
                ...state,
                deletePotSuccess: false,
                errorDelete: null,
                isDeleting: false
            };

        default:
            return state;
    }
};

export default potsReducer;
