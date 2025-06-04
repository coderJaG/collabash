//src/store/users.js

import { csrfFetch } from "./csrf";
// Assuming session actions might be needed to update current user in session state
// import { setUser } from './session'; // Or whatever action updates session.user

//--action types--

// For fetching all users
export const GET_ALL_USERS_START = 'users/GET_ALL_USERS_START';
export const GET_ALL_USERS_SUCCESS = 'users/GET_ALL_USERS_SUCCESS';
export const GET_ALL_USERS_FAILURE = 'users/GET_ALL_USERS_FAILURE';

// For clearing current user details (e.g., when navigating away)
export const CLEAR_CURRENT_USER_DETAILS = 'users/CLEAR_CURRENT_USER_DETAILS';

// For fetching a single user by ID
const GET_USER_BY_ID_START = 'users/GET_USER_BY_ID_START'; // Corrected: GET_USER_BY_Id_START to GET_USER_BY_ID_START
const GET_USER_BY_ID_SUCCESS = 'users/GET_USER_BY_ID_SUCCESS'; // Corrected
const GET_USER_BY_ID_FAILURE = 'users/GET_USER_BY_ID_FAILURE'; // Corrected

// For deleting a user by ID
const DELETE_USER_BY_ID_START = 'users/DELETE_USER_BY_ID_START';
const DELETE_USER_BY_ID_SUCCESS = 'users/DELETE_USER_BY_ID_SUCCESS';
const DELETE_USER_BY_ID_FAILURE = 'users/DELETE_USER_BY_ID_FAILURE';

// For updating a user by ID <<-- NEW -->>
const UPDATE_USER_START = 'users/UPDATE_USER_START';
const UPDATE_USER_SUCCESS = 'users/UPDATE_USER_SUCCESS';
const UPDATE_USER_FAILURE = 'users/UPDATE_USER_FAILURE';


//--action creators--

//get all users
const getAllUsersStart = () => ({ type: GET_ALL_USERS_START });
const getAllUsersSuccess = (usersData) => ({ type: GET_ALL_USERS_SUCCESS, payload: usersData });
const getAllUsersFailure = (error) => ({ type: GET_ALL_USERS_FAILURE, payload: error });
export const clearCurrentUserDetails = () => ({ type: CLEAR_CURRENT_USER_DETAILS });

//get user by id
const getUserByIdStart = (userId) => ({ type: GET_USER_BY_ID_START, payload: userId });
const getUserByIdSuccess = (userData) => ({ type: GET_USER_BY_ID_SUCCESS, payload: userData });
const getUserByIdFailure = (error) => ({ type: GET_USER_BY_ID_FAILURE, payload: error });

//delete user by id
const deleteUserByIdStart = (userId) => ({ type: DELETE_USER_BY_ID_START, payload: userId });
const deleteUserByIdSuccess = (userId) => ({ type: DELETE_USER_BY_ID_SUCCESS, payload: userId });
const deleteUserByIdFailure = (error) => ({ type: DELETE_USER_BY_ID_FAILURE, payload: error });

//update user by id <<-- NEW -->>
const updateUserStart = (userId) => ({ type: UPDATE_USER_START, payload: userId });
const updateUserSuccess = (userData) => ({ type: UPDATE_USER_SUCCESS, payload: userData });
const updateUserFailure = (error) => ({ type: UPDATE_USER_FAILURE, payload: error });


//--thunks--

// Helper to process error responses (similar to pots store)
const processUserErrorResponse = async (response, defaultMessage) => {
    let errorData = {
        status: response.status,
        message: defaultMessage,
        errors: {} // Changed from array to object to match backend validation error structure
    };
    try {
        const backendError = await response.json();
        errorData = { ...errorData, ...backendError }; // Spread backendError to capture all its fields

        // Ensure message is a string
        if (typeof errorData.message === 'object' && errorData.message !== null) {
            errorData.message = errorData.message.detail || errorData.message.error || JSON.stringify(errorData.message);
        } else if (!errorData.message && backendError.errors && Object.keys(backendError.errors).length > 0) {
            // Construct a message from validation errors if top-level message is missing
            errorData.message = Object.values(backendError.errors).join(' ');
        } else if (!errorData.message) {
           errorData.message = response.statusText || defaultMessage;
        }

    } catch (e) {
        // If response.json() fails or other error
        errorData.message = response.statusText || defaultMessage;
    }
    if (typeof errorData.message !== 'string') {
        errorData.message = String(errorData.message || defaultMessage);
    }
    return errorData;
};


//get all users
export const getAllUsers = () => async (dispatch) => {
    dispatch(getAllUsersStart());
    try {
        const res = await csrfFetch('/api/users');
        if (!res.ok) {
            throw await processUserErrorResponse(res, 'Could not get users');
        }
        const userData = await res.json();
        dispatch(getAllUsersSuccess(userData));
    } catch (caughtError) {
        // Ensure caughtError is an object with a message property
        const errorToDispatch = (typeof caughtError === 'object' && caughtError !== null && caughtError.message)
            ? caughtError
            : { message: String(caughtError) || 'An unknown error occurred while fetching users.' , errors: caughtError.errors || {}};
        dispatch(getAllUsersFailure(errorToDispatch));
    }
};

//get user by id
export const getUserById = (userId) => async (dispatch) => {
    dispatch(getUserByIdStart(userId));
    try {
        const res = await csrfFetch(`/api/users/${userId}`);
        if (!res.ok) {
            throw await processUserErrorResponse(res, 'Could not get user');
        }
        const userData = await res.json();
        dispatch(getUserByIdSuccess(userData));
    } catch (caughtError) {
        const errorToDispatch = (typeof caughtError === 'object' && caughtError !== null && caughtError.message)
            ? caughtError
            : { message: String(caughtError) || 'An unknown error occurred while fetching user details.', errors: caughtError.errors || {} };
        dispatch(getUserByIdFailure(errorToDispatch));
    }
};

//update user by id 
export const updateUser = (userId, userData) => async (dispatch) => {
    dispatch(updateUserStart(userId));
    try {
        const res = await csrfFetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!res.ok) {
            const errorResponse = await processUserErrorResponse(res, 'Could not update user profile.');
            throw errorResponse; // Throw the processed error object
        }
        const { user: updatedUser } = await res.json(); // Assuming backend returns { user: ... }
        dispatch(updateUserSuccess(updatedUser));
        // IMPORTANT: If this is the current session user, update the session state as well.
        // This might involve dispatching an action from your session slice.
        // For example: dispatch(sessionActions.setUser(updatedUser));
        // Or your session reducer might listen for UPDATE_USER_SUCCESS.
        // For now, we return the user, the component handles refreshing session via restoreUser.
        return updatedUser;
    } catch (caughtError) {
        const errorToDispatch = (typeof caughtError === 'object' && caughtError !== null && caughtError.message)
            ? caughtError
            : { message: String(caughtError) || 'An unknown error occurred while updating profile.', errors: caughtError.errors || {} };

        dispatch(updateUserFailure(errorToDispatch));
        throw errorToDispatch; // Re-throw for the component to catch
    }
};


//delete user by id
export const deleteUserById = (userId) => async (dispatch) => {
    dispatch(deleteUserByIdStart(userId));
    try {
        const res = await csrfFetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            throw await processUserErrorResponse(res, 'Could not delete user');
        }
        // const data = await res.json(); // Usually no body for DELETE success
        dispatch(deleteUserByIdSuccess(userId));
    } catch (caughtError) {
        const errorToDispatch = (typeof caughtError === 'object' && caughtError !== null && caughtError.message)
            ? caughtError
            : { message: String(caughtError) || 'An unknown error occurred while deleting user.', errors: caughtError.errors || {} };
        dispatch(deleteUserByIdFailure(errorToDispatch));
    }
};

const initialState = {
    allUsers: {},
    userById: {},
    isLoadingAllUsers: false,
    errorAllUsers: null,
    isLoadingUserDetails: false,
    errorUserDetails: null,
    isDeletingUser: false,
    errorDeletingUser: null,
    isUpdatingUser: false, // <<-- NEW -->>
    errorUpdateUser: null  // <<-- NEW -->>
};

const usersReducer = (state = initialState, action) => {
    switch (action.type) {
        case GET_ALL_USERS_START: {
            return { ...state, isLoadingAllUsers: true, errorAllUsers: null };
        }
        case GET_ALL_USERS_SUCCESS: {
            const newAllUsers = {};
            if (action.payload && Array.isArray(action.payload.Users)) {
                action.payload.Users.forEach(user => {
                    newAllUsers[user.id] = user;
                });
            }
            return { ...state, isLoadingAllUsers: false, allUsers: newAllUsers, errorAllUsers: null };
        }
        case GET_ALL_USERS_FAILURE: {
            return { ...state, isLoadingAllUsers: false, errorAllUsers: action.payload };
        }
        case GET_USER_BY_ID_START: { // Corrected action type name
            return { ...state, isLoadingUserDetails: true, errorUserDetails: null, userById: {} };
        }
        case GET_USER_BY_ID_SUCCESS: { // Corrected action type name
            return { ...state, isLoadingUserDetails: false, userById: action.payload, errorUserDetails: null };
        }
        case GET_USER_BY_ID_FAILURE: { // Corrected action type name
            return { ...state, isLoadingUserDetails: false, errorUserDetails: action.payload };
        }
        case DELETE_USER_BY_ID_START: {
            return { ...state, isDeletingUser: true, errorDeletingUser: null };
        }
        case DELETE_USER_BY_ID_SUCCESS: {
            const newState = { ...state, isDeletingUser: false };
            const updatedAllUsers = { ...newState.allUsers };
            delete updatedAllUsers[action.payload]; // action.payload is userId
            const updatedUserById = (newState.userById && newState.userById.id === action.payload) ? {} : newState.userById;
            return { ...newState, allUsers: updatedAllUsers, userById: updatedUserById };
        }
        case DELETE_USER_BY_ID_FAILURE:
            return { ...state, isDeletingUser: false, errorDeletingUser: action.payload };

        // <<-- NEW REDUCER CASES -->>
        case UPDATE_USER_START: {
            return { ...state, isUpdatingUser: true, errorUpdateUser: null };
        }
        case UPDATE_USER_SUCCESS: {
            const updatedUser = action.payload;
            const newAllUsers = { ...state.allUsers, [updatedUser.id]: updatedUser };
            const newUserById = (state.userById && state.userById.id === updatedUser.id) ? updatedUser : state.userById;
            // If the updated user is the one currently in userById, update it too.
            // Or if userById was for a different user, it remains unchanged.
            return {
                ...state,
                isUpdatingUser: false,
                allUsers: newAllUsers,
                userById: newUserById, // Update userById if it's the same user
                errorUpdateUser: null
            };
        }
        case UPDATE_USER_FAILURE: {
            return { ...state, isUpdatingUser: false, errorUpdateUser: action.payload };
        }

        case CLEAR_CURRENT_USER_DETAILS: {
            return { ...state, userById: {}, isLoadingUserDetails: false, errorUserDetails: null };
        }
        default:
            return state;
    }
};

export default usersReducer;
