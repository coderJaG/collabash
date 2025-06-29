// store/users.js
 
import { csrfFetch } from "./csrf";

//--action types--
export const GET_ALL_USERS_START = 'users/GET_ALL_USERS_START';
export const GET_ALL_USERS_SUCCESS = 'users/GET_ALL_USERS_SUCCESS';
export const GET_ALL_USERS_FAILURE = 'users/GET_ALL_USERS_FAILURE';
export const CLEAR_CURRENT_USER_DETAILS = 'users/CLEAR_CURRENT_USER_DETAILS';
const GET_USER_BY_ID_START = 'users/GET_USER_BY_ID_START';
const GET_USER_BY_ID_SUCCESS = 'users/GET_USER_BY_ID_SUCCESS';
const GET_USER_BY_ID_FAILURE = 'users/GET_USER_BY_ID_FAILURE';
const DELETE_USER_BY_ID_START = 'users/DELETE_USER_BY_ID_START';
const DELETE_USER_BY_ID_SUCCESS = 'users/DELETE_USER_BY_ID_SUCCESS';
const DELETE_USER_BY_ID_FAILURE = 'users/DELETE_USER_BY_ID_FAILURE';
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
export const getAllUsers = () => async (dispatch) => {
    dispatch(getAllUsersStart());
    try {
        const res = await csrfFetch('/api/users');
        const data = await res.json();
        if (!res.ok) throw data;
        dispatch(getAllUsersSuccess(data));
    } catch (error) {
        dispatch(getAllUsersFailure(error));
    }
};

export const getUserById = (userId) => async (dispatch) => {
    dispatch(getUserByIdStart(userId));
    try {
        const res = await csrfFetch(`/api/users/${userId}`);
        const data = await res.json();
        if (!res.ok) throw data;
        dispatch(getUserByIdSuccess(data));
    } catch (error) {
        dispatch(getUserByIdFailure(error));
    }
};


export const updateUser = (userId, userData) => async (dispatch) => {
    dispatch(updateUserStart(userId));
    try {
        const res = await csrfFetch(`/api/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });

        const data = await res.json();
        dispatch(updateUserSuccess(data.user));
        return data.user;

    } catch (error) {
        const updateErrorData = await error.json()
        dispatch(updateUserFailure(updateErrorData));
        throw updateErrorData;
    }
};


export const deleteUserById = (userId) => async (dispatch) => {
    dispatch(deleteUserByIdStart(userId));
    try {
        const res = await csrfFetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            throw errorData; 
        }
        
        dispatch(deleteUserByIdSuccess(userId));
        return { success: true };
    } catch (error) {
        dispatch(deleteUserByIdFailure(error));
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
        case GET_ALL_USERS_START:
            return { ...state, isLoadingAllUsers: true, errorAllUsers: null };
        case GET_ALL_USERS_SUCCESS: {
            const newAllUsers = {};
            if (action.payload && Array.isArray(action.payload.Users)) {
                action.payload.Users.forEach(user => {
                    newAllUsers[user.id] = user;
                });
            }
            return { ...state, isLoadingAllUsers: false, allUsers: newAllUsers, errorAllUsers: null };
        }
        case GET_ALL_USERS_FAILURE:
            return { ...state, isLoadingAllUsers: false, errorAllUsers: action.payload };

        case GET_USER_BY_ID_START:
            return { ...state, isLoadingUserDetails: true, errorUserDetails: null, userById: {} };
        case GET_USER_BY_ID_SUCCESS:
            return { ...state, isLoadingUserDetails: false, userById: action.payload, errorUserDetails: null };
        case GET_USER_BY_ID_FAILURE:
            return { ...state, isLoadingUserDetails: false, errorUserDetails: action.payload };

        case DELETE_USER_BY_ID_START:
            return { ...state, isDeletingUser: true, errorDeletingUser: null };
        case DELETE_USER_BY_ID_SUCCESS: {
            const newState = { ...state, isDeletingUser: false, errorDeletingUser: null }; // Clear error on success
            const updatedAllUsers = { ...newState.allUsers };
            delete updatedAllUsers[action.payload];
            const updatedUserById = (newState.userById && newState.userById.id === action.payload) ? {} : newState.userById;
            return { ...newState, allUsers: updatedAllUsers, userById: updatedUserById };
        }
        case DELETE_USER_BY_ID_FAILURE:
            return { ...state, isDeletingUser: false, errorDeletingUser: action.payload };

        case UPDATE_USER_START:
            return { ...state, isUpdatingUser: true, errorUpdateUser: null };
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
        case UPDATE_USER_FAILURE:
            return { ...state, isUpdatingUser: false, errorUpdateUser: action.payload };

        case CLEAR_CURRENT_USER_DETAILS:
            return { ...state, userById: {}, isLoadingUserDetails: false, errorUserDetails: null };
            
        default:
            return state;
    }
};

export default usersReducer;
