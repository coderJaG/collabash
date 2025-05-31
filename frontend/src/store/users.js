//src/store/users.js

import { csrfFetch } from "./csrf";

//--action types--

// For fetching all users
export const GET_ALL_USERS_START = 'users/GET_ALL_USERS_START';
export const GET_ALL_USERS_SUCCESS = 'users/GET_ALL_USERS_SUCCESS';
export const GET_ALL_USERS_FAILURE = 'users/GET_ALL_USERS_FAILURE';

// For clearing current user details (e.g., when navigating away)
export const CLEAR_CURRENT_USER_DETAILS = 'users/CLEAR_CURRENT_USER_DETAILS';

// For fetching a single user by ID
const GET_USER_BY_Id_START = 'users/GET_USER_BY_Id_START';
const GET_USER_BY_Id_SUCCESS = 'users/GET_USER_BY_Id_SUCCESS';
const GET_USER_BY_Id_FAILURE = 'users/GET_USER_BY_Id_FAILURE';

// For deleting a user by ID
const DELETE_USER_BY_ID_START = 'users/DELETE_USER_BY_ID_START';
const DELETE_USER_BY_ID_SUCCESS = 'users/DELETE_USER_BY_ID_SUCCESS';
const DELETE_USER_BY_ID_FAILURE = 'users/DELETE_USER_BY_ID_FAILURE';

//--action creators--

//get all users
const getAllUsersStart = () => ({ type: GET_ALL_USERS_START });
const getAllUsersSuccess = (usersData) => ({ type: GET_ALL_USERS_SUCCESS, payload: usersData });
const getAllUsersFailure = (error) => ({ type: GET_ALL_USERS_FAILURE, payload: error });
export const clearCurrentUserDetails = () => ({ type: CLEAR_CURRENT_USER_DETAILS });

//get user by id
const getUserByIdStart = (userId) => ({ type: GET_USER_BY_Id_START, payload: userId });
const getUserByIdSuccess = (userData) => ({ type: GET_USER_BY_Id_SUCCESS, payload: userData });
const getUserByIdFailure = (error) => ({ type: GET_USER_BY_Id_FAILURE, payload: error });

//delete user by id
const deleteUserByIdStart = (userId) => ({ type: DELETE_USER_BY_ID_START, payload: userId });
const deleteUserByIdSuccess = (userId) => ({ type: DELETE_USER_BY_ID_SUCCESS, payload: userId });
const deleteUserByIdFailure = (error) => ({ type: DELETE_USER_BY_ID_FAILURE, payload: error });



//--thunks--

// Helper to process error responses (similar to pots store)
const processUserErrorResponse = async (response, defaultMessage) => {
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
        let errorToDispatch;
        if (caughtError instanceof Response) {
            errorToDispatch = await processUserErrorResponse(caughtError, 'Could not get users (processed in catch)');
        } else {
            errorToDispatch = {
                message: caughtError.message || String(caughtError) || 'An unknown error occurred while fetching users.',
                status: caughtError.status,
                ...(typeof caughtError === 'object' && caughtError !== null ? caughtError : {})
            };
        }
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
        let errorToDispatch;
        if (caughtError instanceof Response) {
            errorToDispatch = await processUserErrorResponse(caughtError, 'Could not get user (processed in catch)');
        } else {
            errorToDispatch = {
                message: caughtError.message || String(caughtError) || 'An unknown error occurred while fetching user details.',
                status: caughtError.status,
                ...(typeof caughtError === 'object' && caughtError !== null ? caughtError : {})
            };
        }
        dispatch(getUserByIdFailure(errorToDispatch));
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
        // const data = await res.json();
        dispatch(deleteUserByIdSuccess(userId)); 
    } catch (caughtError) {
        let errorToDispatch;
        if (caughtError instanceof Response) {
            errorToDispatch = await processUserErrorResponse(caughtError, 'Could not delete user (processed in catch)');
        } else {
            errorToDispatch = {
                message: caughtError.message || String(caughtError) || 'An unknown error occurred while deleting user.',
                status: caughtError.status,
                ...(typeof caughtError === 'object' && caughtError !== null ? caughtError : {})
            };
        }
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
    errorDeletingUser: null
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
        case GET_USER_BY_Id_START: {
            return { ...state, isLoadingUserDetails: true, errorUserDetails: null, userById: {} };
        }
        case GET_USER_BY_Id_SUCCESS: {
            return { ...state, isLoadingUserDetails: false, userById: action.payload, errorUserDetails: null };
        }
        case GET_USER_BY_Id_FAILURE: {
            return { ...state, isLoadingUserDetails: false, errorUserDetails: action.payload };
        }
        case DELETE_USER_BY_ID_START: {
            return { ...state, isDeletingUser: true, errorDeletingUser: null };
        }
        case DELETE_USER_BY_ID_SUCCESS: {
            const newState = { ...state, isDeletingUser: false };
            const updatedAllUsers = { ...newState.allUsers };
            delete updatedAllUsers[action.payload]; 
            return { ...newState, allUsers: updatedAllUsers };
        }
        case DELETE_USER_BY_ID_FAILURE:
            return { ...state, isDeletingUser: false, errorDeletingUser: action.payload };
        case CLEAR_CURRENT_USER_DETAILS: {
            return { ...state, userById: {}, isLoadingUserDetails: false, errorUserDetails: null };
        }
        default:
            return state;
    }
};

export default usersReducer;
