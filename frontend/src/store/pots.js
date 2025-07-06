// store/pots.js

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

//add dingle user to pot
const ADD_USER_TO_POT_START = 'pots/ADD_USER_TO_POT_START';
const ADD_USER_TO_POT_SUCCESS = 'pots/ADD_USER_TO_POT_SUCCESS';
const ADD_USER_TO_POT_FAILURE = 'pots/ADD_USER_TO_POT_FAILURE';

//add multiple users to pot
const ADD_USERS_TO_POT_START = 'pots/ADD_USERS_TO_POT_START';
const ADD_USERS_TO_POT_SUCCESS = 'pots/ADD_USERS_TO_POT_SUCCESS';
const ADD_USERS_TO_POT_FAILURE = 'pots/ADD_USERS_TO_POT_FAILURE';

//remove user from pot
const REMOVE_USER_FROM_POT_START = 'pots/REMOVE_USER_FROM_POT_START';
const REMOVE_USER_FROM_POT_SUCCESS = 'pots/REMOVE_USER_FROM_POT_SUCCESS';
const REMOVE_USER_FROM_POT_FAILURE = 'pots/REMOVE_USER_FROM_POT_FAILURE';

//reorder users in pot
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

// Add single User to Pot
// const addUserToPotStart = () => ({ type: ADD_USER_TO_POT_START });
// const addUserToPotSuccess = (potUserData) => ({ type: ADD_USER_TO_POT_SUCCESS, payload: potUserData });
// const addUserToPotFailure = (error) => ({ type: ADD_USER_TO_POT_FAILURE, payload: error });

// Add multiple Users to Pot
const addUsersToPotStart = () => ({ type: ADD_USERS_TO_POT_START });
const addUsersToPotSuccess = (payload) => ({ type: ADD_USERS_TO_POT_SUCCESS, payload });
const addUsersToPotFailure = (error) => ({ type: ADD_USERS_TO_POT_FAILURE, payload: error });

// Remove User from Pot
const removeUserFromPotStart = () => ({ type: REMOVE_USER_FROM_POT_START });
const removeUserFromPotSuccess = (potUserData) => ({ type: REMOVE_USER_FROM_POT_SUCCESS, payload: potUserData });
const removeUserFromPotFailure = (error) => ({ type: REMOVE_USER_FROM_POT_FAILURE, payload: error });


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
        status: response.status,
        message: defaultMessage,
        errors: []
    };
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
        console.warn("Could not parse JSON error response, using status text/default message:", e);
    }
    // Final check to ensure message is a string
    if (typeof errorData.message !== 'string') {
        errorData.message = String(errorData.message || defaultMessage);
    }
    return errorData;
};


// --- Thunks ---
// Fetch all pots
export const getPots = () => async (dispatch) => {
    dispatch(getAllPotsStart());
    try {
        const res = await csrfFetch('/api/pots');
        if (!res.ok) {
            throw await processErrorResponse(res, 'Failed to fetch pots');
        }
        const data = await res.json();
        dispatch(getAllPotsSuccess(data));
    } catch (caughtError) {
        let errorToDispatch;
        if (caughtError instanceof Response) {
            errorToDispatch = await processErrorResponse(caughtError, 'Failed to fetch pots (processed in catch)');
        } else {
            errorToDispatch = {
                message: caughtError.message || String(caughtError) || 'An unknown error occurred while fetching pots.',
                status: caughtError.status, // Preserve status if it exists
                ...(typeof caughtError === 'object' && caughtError !== null ? caughtError : {})
            };
        }
        dispatch(getAllPotsFailure(errorToDispatch));
    }
};

// Fetch a pot by ID
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

// Create a new pot
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
        throw errorToDispatch;
    }
};

// Update an existing pot
export const updateAPot = (potData, potId) => async (dispatch) => {
    console.log("Updating pot with data:", potData, "and ID:", potId);
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

// Delete a pot
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
        return res;
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
    }
};

// Add single user to a pot
export const addUserToPot = (userData) => async (dispatch) => {
    const { potId, userId } = userData;

    if (!potId || !userId) {
        throw new Error('Both potId and userId are required');
    }

    // Use bulk function with a single user
    try {
        const result = await dispatch(addUsersToPot(potId, [userId]));

        // Transform the bulk response to match the single-user format
        const transformedResult = {
            ...result,
            userId: userId,
            // For backward compatibility, include the old message format if only one user
            message: result.summary?.added === 1 ?
                `User successfully added to pot` :
                result.message
        };

        return transformedResult;
    } catch (error) {
        throw {
            ...error,
            userId,
            potId
        };
    }
};

// Add multiple users to a pot
export const addUsersToPot = (potId, userIds) => async (dispatch) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('Invalid user IDs provided - must be a non-empty array');
    }

    const numPotId = parseInt(potId);
    if (isNaN(numPotId)) {
        throw new Error('Invalid pot ID provided');
    }

    dispatch(addUsersToPotStart());

    try {
        const res = await csrfFetch(`/api/pots/${numPotId}/addusers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds }), // Send as userIds array
        });

        if (!res.ok) {
            throw await processErrorResponse(res, `Failed to add users to pot ${potId}`);
        }

        const data = await res.json();

        // Enhanced success payload with summary data
        const successPayload = {
            message: data.message || `Successfully processed ${userIds.length} users`,
            potId: numPotId,
            userIds,
            summary: data.summary || {
                totalRequested: userIds.length,
                added: 0,
                skipped: 0,
                notFound: 0,
                addedUsers: [],
                skippedUsers: [],
                notFoundUsers: []
            },
            updatedPot: data
        };

        dispatch(addUsersToPotSuccess(successPayload));

        // Update the current pot details with the returned data
        if (data.id) {
            dispatch(getPotByIdSuccess(data));
        }

        return data;

    } catch (caughtError) {
        let errorToDispatch;
        if (caughtError instanceof Response) {
            errorToDispatch = await processErrorResponse(caughtError, `Failed to add users to pot (processed in catch)`);
        } else {
            errorToDispatch = {
                message: caughtError.message || String(caughtError) || 'An unknown error occurred while adding users.',
                status: caughtError.status,
                potId: numPotId,
                userIds,
                ...(typeof caughtError === 'object' && caughtError !== null ? caughtError : {})
            };
        }
        dispatch(addUsersToPotFailure(errorToDispatch));
        throw errorToDispatch;
    }
};

// Remove user from a pot
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
        const updatedPot = await res.json();
        dispatch(reorderPotUsersSuccess(updatedPot));

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
        throw errorToDispatch;
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
        case GET_ALL_POTS_SUCCESS: {
            const newAllById = {};
            if (action.payload && action.payload.Pots) {
                action.payload.Pots.forEach(pot => {
                    newAllById[pot.id] = pot;
                });
            }

            return { ...state, isLoadingList: false, allById: newAllById, errorList: null };
        }
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

        // Add multiple Users to Pot
        case ADD_USERS_TO_POT_START:
            return {
                ...state,
                isUpdating: true,
                errorUpdate: null,
                addUserStatus: null
            };

        case ADD_USERS_TO_POT_SUCCESS:
            return {
                ...state,
                isUpdating: false,
                addUserStatus: {
                    success: true,
                    message: action.payload.message,
                    potId: action.payload.potId,
                    userIds: action.payload.userIds,
                    isBulkOperation: action.payload.userIds.length > 1,
                    summary: action.payload.summary,
                    timestamp: new Date().toISOString()
                },
                // Update the pot in allById if it exists
                allById: action.payload.updatedPot?.id ? {
                    ...state.allById,
                    [action.payload.updatedPot.id]: action.payload.updatedPot
                } : state.allById,
                errorUpdate: null
            };

        case ADD_USERS_TO_POT_FAILURE:
            return {
                ...state,
                isUpdating: false,
                errorUpdate: action.payload,
                addUserStatus: {
                    success: false,
                    message: action.payload.message,
                    potId: action.payload.potId,
                    userIds: action.payload.userIds,
                    error: action.payload,
                    timestamp: new Date().toISOString()
                }
            };

        // Add User to Pot
        case ADD_USER_TO_POT_START:
            return {
                ...state,
                isUpdating: true,
                errorUpdate: null,
                addUserStatus: null
            };

        case ADD_USER_TO_POT_SUCCESS:
            return {
                ...state,
                isUpdating: false,
                addUserStatus: {
                    success: true,
                    message: action.payload.message,
                    userId: action.payload.userId,
                    potId: action.payload.potId,
                    userIds: action.payload.userIds || [action.payload.userId],
                    isBulkOperation: false,
                    summary: action.payload.summary,
                    timestamp: new Date().toISOString()
                },
                errorUpdate: null
            };

        case ADD_USER_TO_POT_FAILURE:
            return {
                ...state,
                isUpdating: false,
                errorUpdate: action.payload,
                addUserStatus: {
                    success: false,
                    message: action.payload.message,
                    userId: action.payload.userId,
                    potId: action.payload.potId,
                    error: action.payload,
                    timestamp: new Date().toISOString()
                }
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
