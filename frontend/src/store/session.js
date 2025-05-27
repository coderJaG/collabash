import { csrfFetch } from './csrf';


const ADD_USER_SESSION = 'session/addUserSession';
const REMOVE_USER_SESSSION = 'session/removeUserSession';

const addUserSession = (user) => ({
    type: ADD_USER_SESSION,
    payload: user
});

const removeUserSession = () => ({
    type: REMOVE_USER_SESSSION
});

// Helper to process error responses
const processSessionErrorResponse = async (response, defaultMessage) => {
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
            const firstErrorKey = Object.keys(backendError.errors)[0];
            errorData.message = backendError.errors[firstErrorKey] || defaultMessage; // Use first field error as general if no top-level message
        } else if (!errorData.message) {
            errorData.message = response.statusText || defaultMessage;
        }
    } catch (e) {
        errorData.message = response.statusText || defaultMessage;
    }
    if (typeof errorData.message !== 'string') {
        errorData.message = String(errorData.message || defaultMessage);
    }
    // Ensure errors is an object
    if (typeof errorData.errors !== 'object' || errorData.errors === null) {
        errorData.errors = {};
    }
    return errorData;
};


export const login = (user) => async (dispatch) => {
    const { credential, password } = user;
    try {
        const res = await csrfFetch('/api/session', {
            method: 'POST',
            body: JSON.stringify({ credential, password })
        });
        const data = await res.json();
        if (res.ok && data.user) {
            dispatch(addUserSession(data.user));
            return res;
        } else {
            // Throw a structured error based on backend response or a default
            throw {
                message: data.message || "Login failed. Please check your credentials.",
                errors: data.errors || {},
                status: res.status
            };
        }
    } catch (caughtError) {
        let errorToThrow;
        if (caughtError instanceof Response) {
            errorToThrow = await processSessionErrorResponse(caughtError, 'Login failed due to a server or network issue.');
        } else {
            errorToThrow = {
                message: caughtError.message || 'An unknown error occurred during login.',
                errors: caughtError.errors || {},
                status: caughtError.status
            };
        }
        throw errorToThrow;
    }
};

export const restoreUser = () => async (dispatch) => {
    try {
        let res = await csrfFetch('/api/session');
        const data = await res.json();
        if (res.ok && data.user) {
            dispatch(addUserSession(data.user));
        } else if (res.ok && !data.user) {
            dispatch(removeUserSession());
        }
        return res;
    } catch (error) {
        console.error("Restore user failed:", error);
        dispatch(removeUserSession());
        return error instanceof Response ? error : { ok: false, status: 500, message: "Restore user failed" };
    }
};

export const signUp = (userData, createdByBanker = false) => async (dispatch) => {
    const { firstName, lastName, username, email, mobile, password, role } = userData; // Removed unused fields for this thunk
    try {
        const res = await csrfFetch('/api/users', {
            method: 'POST',
            body: JSON.stringify({
                firstName, lastName, username, email, mobile, password,
                role: role || 'standard',
                meta_createdByBanker: createdByBanker
            })
        });

        const data = await res.json(); // Always try to parse JSON

        if (res.ok && data.user) {
            if (!createdByBanker) {
                dispatch(addUserSession(data.user));
            }
            return data; // For .then() in component (contains data.user)
        } else {
            // If !res.ok, 'data' should be the parsed error response from the backend
            // (e.g., { message: "Validation failed", errors: { username: "Cannot be an email" } })
            throw { // Throw a structured error object
                message: data.message || `Signup failed with status: ${res.status}`,
                errors: data.errors || {}, // Ensure errors is an object
                status: res.status
            };
        }
    } catch (caughtError) {
        console.error("Signup thunk error:", caughtError);
        // Ensure the error re-thrown to the component is always a structured object
        // with 'message' and 'errors' properties.
        let errorToThrow;
        if (caughtError instanceof Response) { // Should ideally not happen if we always .json()
            errorToThrow = await processSessionErrorResponse(caughtError, 'Signup failed due to a server or network issue.');
        } else {
            errorToThrow = {
                message: caughtError.message || "An unknown error occurred during signup.",
                errors: (typeof caughtError.errors === 'object' && caughtError.errors !== null) ? caughtError.errors : {},
                status: caughtError.status
            };
        }
        // Ensure message is a string
        if (typeof errorToThrow.message !== 'string') {
            errorToThrow.message = String(errorToThrow.message);
        }
        throw errorToThrow;
    }
};

export const logOutCurrUser = () => async (dispatch) => {
    try {
        const res = await csrfFetch('/api/session', { method: 'DELETE' });
        dispatch(removeUserSession());
        return res;
    } catch (error) {
        console.error("Logout failed:", error);
        dispatch(removeUserSession());
        throw error;
    }
};

const initialState = { user: null };

const sessionReducer = (state = initialState, action) => {
    switch (action.type) {
        case ADD_USER_SESSION:
            return { ...state, user: action.payload || null };
        case REMOVE_USER_SESSSION:
            return { ...state, user: null };
        default:
            return state;
    }
};

export default sessionReducer;
