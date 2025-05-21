
import { csrfFetch } from "./csrf";


export const GET_ALL_POTS_START = 'pots/GET_ALL_POTS_START';
export const GET_ALL_POTS_SUCCESS = 'pots/GET_ALL_POTS_SUCCESS';
export const GET_ALL_POTS_FAILURE = 'pots/GET_ALL_POTS_FAILURE';

export const GET_POT_BY_ID_START = 'pots/GET_POT_BY_ID_START';
export const GET_POT_BY_ID_SUCCESS = 'pots/GET_POT_BY_ID_SUCCESS';
export const GET_POT_BY_ID_FAILURE = 'pots/GET_POT_BY_ID_FAILURE';

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

// --- Action Creators ---

// Get All Pots
const getAllPotsStart = () => ({ type: GET_ALL_POTS_START });
const getAllPotsSuccess = (pots) => ({ type: GET_ALL_POTS_SUCCESS, payload: pots });
const getAllPotsFailure = (error) => ({ type: GET_ALL_POTS_FAILURE, payload: error });

// Get Pot By ID
const getPotByIdStart = () => ({ type: GET_POT_BY_ID_START });
const getPotByIdSuccess = (pot) => ({ type: GET_POT_BY_ID_SUCCESS, payload: pot });
const getPotByIdFailure = (error) => ({ type: GET_POT_BY_ID_FAILURE, payload: error });

// Create New Pot
const createPotStart = () => ({ type: CREATE_POT_START });
const createPotSuccess = (pot) => ({ type: CREATE_POT_SUCCESS, payload: pot });
const createPotFailure = (error) => ({ type: CREATE_POT_FAILURE, payload: error });

// Update Pot
const updatePotStart = () => ({ type: UPDATE_POT_START });
const updatePotSuccess = (pot) => ({ type: UPDATE_POT_SUCCESS, payload: pot });
const updatePotFailure = (error) => ({ type: UPDATE_POT_FAILURE, payload: error });

// Delete Pot
const deletePotStart = () => ({ type: DELETE_POT_START });
const deletePotSuccess = (potId) => ({ type: DELETE_POT_SUCCESS, payload: potId });
const deletePotFailure = (error) => ({ type: DELETE_POT_FAILURE, payload: error });
export const resetDeletePotStatus = () => ({ type: RESET_DELETE_POT_STATUS })

// Add User to Pot
const addUserToPotStart = () => ({ type: ADD_USER_TO_POT_START });
const addUserToPotSuccess = (potUserData) => ({ type: ADD_USER_TO_POT_SUCCESS, payload: potUserData });
const addUserToPotFailure = (error) => ({ type: ADD_USER_TO_POT_FAILURE, payload: error });
// Remove User from Pot
const removeUserFromPotStart = () => ({ type: REMOVE_USER_FROM_POT_START });
const removeUserFromPotSuccess = (potUserData) => ({ type: REMOVE_USER_FROM_POT_SUCCESS, payload: potUserData });
const removeUserFromPotFailure = (error) => ({ type: REMOVE_USER_FROM_POT_FAILURE, payload: error });

const initialState = {
    allById: {},              // For the list of all pots
    currentPotDetails: null,  // For the pot fetched by ID or being created/updated
    isLoadingList: false,     // For fetching all pots
    errorList: null,          // Error for fetching all pots
    isLoadingDetails: false,  // For fetching single pot details
    errorDetails: null,       // Error for fetching single pot details
    isCreating: false,        // For creating a pot
    errorCreate: null,        // Error for creating a pot
    isUpdating: false,        // For updating a pot (can be per ID too)
    errorUpdate: null,        // Error for updating a pot
    isDeleting: false,        // For deleting a pot (can be per ID too)
    errorDelete: null,        // Error for deleting a pot
    deletePotSuccess: false,  // Delete pot success
    addUserStatus: null         // For adding user to pot
    // removeUserStatus: null,   // For removing user from pot
};


// --- Thunks ---

// Get All Pots
export const getPots = () => async (dispatch) => {
    dispatch(getAllPotsStart());
    try {
        const res = await csrfFetch('/api/pots');
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(errorData.message || 'Failed to fetch pots');
        }
        const data = await res.json(); // data should be { Pots: [...] }
        dispatch(getAllPotsSuccess(data));
        // return data; // Optional: if components still need direct access, but usually not needed
    } catch (error) {
        dispatch(getAllPotsFailure(error.message));
    }
};

// Get Pot By ID
export const getAPotById = (potId) => async (dispatch) => {
    dispatch(getPotByIdStart());
    try {
        const res = await csrfFetch(`/api/pots/${potId}`);
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(errorData.message || `Failed to fetch pot ${potId}`);
        }
        const data = await res.json();
        dispatch(getPotByIdSuccess(data));
    } catch (error) {
        dispatch(getPotByIdFailure(error.message));

    }
};

// Create New Pot
export const createNewPot = (potData) => async (dispatch) => {
    dispatch(createPotStart());
    try {
        const res = await csrfFetch('/api/pots', {
            method: 'POST',
            body: JSON.stringify(potData),
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(errorData.message || 'Failed to create pot');
        }
        const data = await res.json();
        dispatch(createPotSuccess(data));
        return data;
    } catch (error) {
        dispatch(createPotFailure(error.message));
        throw error; // Re-throw for component to handle if needed (e.g., form errors)
    }
};

// Update a Pot
export const updateAPot = (potData, potId) => async (dispatch) => {
    dispatch(updatePotStart());
    try {
        const res = await csrfFetch(`/api/pots/${potId}`, {
            method: 'PUT',
            body: JSON.stringify(potData),
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(errorData.message || `Failed to update pot ${potId}`);
        }
        const data = await res.json();
        dispatch(updatePotSuccess(data));
        return data;
    } catch (error) {
        dispatch(updatePotFailure(error.message));
        throw error;
    }
};

// Delete a Pot
export const deletePot = (potId) => async (dispatch) => {
    dispatch(deletePotStart());
    try {
        const res = await csrfFetch(`/api/pots/${potId}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(errorData.message || `Failed to delete pot ${potId}`);
        }
        dispatch(deletePotSuccess(potId)); // Pass potId to reducer to remove from state
        return res;
    } catch (error) {
        dispatch(deletePotFailure(error.message));
        // return Promise.reject(error);
    }
};


// Add User to Pot
export const addUserToPot = (userData) => async (dispatch) => {

    const { potId, userId } = userData;
    dispatch(addUserToPotStart());
    try {
        const res = await csrfFetch(`/api/pots/${potId}/addusers`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(errorData.message || `Failed to add user ${userId} to pot ${potId}`);
        }
        const data = await res.json();
        dispatch(addUserToPotSuccess({ message: 'User added successfully' }));
        dispatch(getAPotById(potId)); // Refresh pot details after adding user
        return data;
    } catch (error) {
        dispatch(addUserToPotFailure(error.message));
        throw error;
    }
}

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
            if (action.payload && action.payload.Pots) { // Ensure payload has Pots array
                action.payload.Pots.forEach(pot => {
                    newAllById[pot.id] = pot;
                });
            }
            return { ...state, isLoadingList: false, allById: newAllById, errorList: null };
        case GET_ALL_POTS_FAILURE:
            return { ...state, isLoadingList: false, errorList: action.payload };

        // Get Pot By ID
        case GET_POT_BY_ID_START:
            return { ...state, isLoadingDetails: true, errorDetails: null, currentPotDetails: null }; // Clear previous details
        case GET_POT_BY_ID_SUCCESS:
            return { ...state, isLoadingDetails: false, currentPotDetails: action.payload, errorDetails: null };
        case GET_POT_BY_ID_FAILURE:
            return { ...state, isLoadingDetails: false, errorDetails: action.payload };

        // Create Pot
        case CREATE_POT_START:
            return { ...state, isCreating: true, errorCreate: null };
        case CREATE_POT_SUCCESS:
            return {
                ...state,
                isCreating: false,
                allById: { ...state.allById, [action.payload.id]: action.payload },
                currentPotDetails: action.payload, // Optionally set as current
                errorCreate: null
            };
        case CREATE_POT_FAILURE:
            return { ...state, isCreating: false, errorCreate: action.payload };

        // Update Pot
        case UPDATE_POT_START:
            return { ...state, isUpdating: true, errorUpdate: null };
        case UPDATE_POT_SUCCESS: // Was UPDATE_POT
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
            return { ...state, isUpdating: true, errorUpdate: null, Status: null };
        case ADD_USER_TO_POT_SUCCESS:
            return {
                ...state,
                isUpdating: false,
                addUserStatus: {
                    success: true,
                    message: action.payload.message,
                    // userId: action.payload.userId,
                    // potId: action.payload.potId
                },
                errorUpdate: null
            };
        case ADD_USER_TO_POT_FAILURE:
            return {
                ...state,
                isUpdating: false,
                errorUpdate: action.payload, // Store the error message for adding user
                addUserStatus: { success: false, message: action.payload }
            };
        // Delete Pot
        case DELETE_POT_START:
            return { ...state, isDeleting: true, errorDelete: null };
        case DELETE_POT_SUCCESS: // Was REMOVE_POT
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
            }


        // Remove User from Pot     

        default:
            return state;
    }
};

export default potsReducer;