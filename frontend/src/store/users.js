import { csrfFetch } from "./csrf";

//--action types--

// For fetching all users
export const GET_ALL_USERS_START = 'users/GET_ALL_USERS_START';
export const GET_ALL_USERS_SUCCESS = 'users/GET_ALL_USERS_SUCCESS';
export const GET_ALL_USERS_FAILURE = 'users/GET_ALL_USERS_FAILURE';

// For clearing current user details (e.g., when navigating away)
export const CLEAR_CURRENT_USER_DETAILS = 'users/CLEAR_CURRENT_USER_DETAILS';

// For fetching a single user by ID
const GET_USER_BY_ID_START = 'users/GET_USER_BY_ID_START';
const GET_USER_BY_ID_SUCCESS = 'users/GET_USER_BY_ID_SUCCESS';
const GET_USER_BY_ID_FAILURE = 'users/GET_USER_BY_ID_FAILURE';

// For deleting a user by ID
const DELETE_USER_BY_ID_START = 'users/DELETE_USER_BY_ID_START';
const DELETE_USER_BY_ID_SUCCESS = 'users/DELETE_USER_BY_ID_SUCCESS';
const DELETE_USER_BY_ID_FAILURE = 'users/DELETE_USER_BY_ID_FAILURE';

// For updating a user by ID
const UPDATE_USER_START = 'users/UPDATE_USER_START';
const UPDATE_USER_SUCCESS = 'users/UPDATE_USER_SUCCESS';
const UPDATE_USER_FAILURE = 'users/UPDATE_USER_FAILURE';


//--action creators--

const getAllUsersStart = () => ({ type: GET_ALL_USERS_START });
const getAllUsersSuccess = (usersData) => ({ type: GET_ALL_USERS_SUCCESS, payload: usersData });
const getAllUsersFailure = (error) => ({ type: GET_ALL_USERS_FAILURE, payload: error });
export const clearCurrentUserDetails = () => ({ type: CLEAR_CURRENT_USER_DETAILS });

const getUserByIdStart = (userId) => ({ type: GET_USER_BY_ID_START, payload: userId });
const getUserByIdSuccess = (userData) => ({ type: GET_USER_BY_ID_SUCCESS, payload: userData });
const getUserByIdFailure = (error) => ({ type: GET_USER_BY_ID_FAILURE, payload: error });

const deleteUserByIdStart = (userId) => ({ type: DELETE_USER_BY_ID_START, payload: userId });
const deleteUserByIdSuccess = (userId) => ({ type: DELETE_USER_BY_ID_SUCCESS, payload: userId });
const deleteUserByIdFailure = (error) => ({ type: DELETE_USER_BY_ID_FAILURE, payload: error });

const updateUserStart = (userId) => ({ type: UPDATE_USER_START, payload: userId });
const updateUserSuccess = (userData) => ({ type: UPDATE_USER_SUCCESS, payload: userData });
const updateUserFailure = (error) => ({ type: UPDATE_USER_FAILURE, payload: error });


//--thunks--

const processUserErrorResponse = async (response, defaultMessage) => {
    let errorData = {
        status: response.status,
        message: defaultMessage,
        errors: {}
    };
    try {
        const backendError = await response.json();
        errorData = { ...errorData, ...backendError };
        if (typeof errorData.message === 'object' && errorData.message !== null) {
            errorData.message = errorData.message.detail || errorData.message.error || JSON.stringify(errorData.message);
        } else if (!errorData.message && backendError.errors && Object.keys(backendError.errors).length > 0) {
            errorData.message = Object.values(backendError.errors).join(' ');
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
        const errorToDispatch = (typeof caughtError === 'object' && caughtError !== null && caughtError.message)
            ? caughtError
            : { message: String(caughtError) || 'An unknown error occurred while fetching users.' , errors: caughtError.errors || {}};
        dispatch(getAllUsersFailure(errorToDispatch));
    }
};

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

export const updateUser = (userId, userData) => async (dispatch) => {
    dispatch(updateUserStart(userId));
    try {
        const res = await csrfFetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!res.ok) {
            throw await processUserErrorResponse(res, 'Could not update user profile.');
        }
        const { user: updatedUser } = await res.json();
        dispatch(updateUserSuccess(updatedUser));
        return updatedUser;
    } catch (caughtError) {
        const errorToDispatch = (typeof caughtError === 'object' && caughtError !== null && caughtError.message)
            ? caughtError
            : { message: String(caughtError) || 'An unknown error occurred while updating profile.', errors: caughtError.errors || {} };

        dispatch(updateUserFailure(errorToDispatch));
        throw errorToDispatch;
    }
};

// ✅ FIXED: Thunk now correctly handles and re-throws errors from the backend
export const deleteUserById = (userId) => async (dispatch) => {
    dispatch(deleteUserByIdStart(userId));
    try {
        const res = await csrfFetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (!res.ok) {
            // If the response is not OK, parse the JSON body and throw it as an error.
            const errorData = await res.json();
            throw errorData; 
        }
        
        dispatch(deleteUserByIdSuccess(userId));
        return { success: true }; // Return a success indicator
    } catch (error) {
        // The error is now a clean object with a `message` property.
        dispatch(deleteUserByIdFailure(error));
        // IMPORTANT: Re-throw the error so the component's catch block can fire.
        throw error;
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
    isUpdatingUser: false,
    errorUpdateUser: null
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
        case GET_USER_BY_ID_START: {
            return { ...state, isLoadingUserDetails: true, errorUserDetails: null, userById: {} };
        }
        case GET_USER_BY_ID_SUCCESS: {
            return { ...state, isLoadingUserDetails: false, userById: action.payload, errorUserDetails: null };
        }
        case GET_USER_BY_ID_FAILURE: {
            return { ...state, isLoadingUserDetails: false, errorUserDetails: action.payload };
        }
        case DELETE_USER_BY_ID_START: {
            return { ...state, isDeletingUser: true, errorDeletingUser: null };
        }
        case DELETE_USER_BY_ID_SUCCESS: {
            const newState = { ...state, isDeletingUser: false };
            const updatedAllUsers = { ...newState.allUsers };
            delete updatedAllUsers[action.payload];
            const updatedUserById = (newState.userById && newState.userById.id === action.payload) ? {} : newState.userById;
            return { ...newState, allUsers: updatedAllUsers, userById: updatedUserById };
        }
        case DELETE_USER_BY_ID_FAILURE:
            return { ...state, isDeletingUser: false, errorDeletingUser: action.payload };

        case UPDATE_USER_START: {
            return { ...state, isUpdatingUser: true, errorUpdateUser: null };
        }
        case UPDATE_USER_SUCCESS: {
            const updatedUser = action.payload;
            const newAllUsers = { ...state.allUsers, [updatedUser.id]: updatedUser };
            const newUserById = (state.userById && state.userById.id === updatedUser.id) ? updatedUser : state.userById;
            return {
                ...state,
                isUpdatingUser: false,
                allUsers: newAllUsers,
                userById: newUserById,
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