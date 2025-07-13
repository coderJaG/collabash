// store/session.js

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

export const login = (user) => async (dispatch) => {
    const { credential, password } = user;
    try {
        const res = await csrfFetch('/api/session', {
            method: 'POST',
            body: JSON.stringify({ credential, password })
        });
        
        const data = await res.json();
        dispatch(addUserSession(data.user));
        return data.user;

    } catch (error) {
        const errorData = await error.json();
        throw errorData;
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
        dispatch(removeUserSession());
        return error instanceof Response ? error : { ok: false, status: 500, message: "Restore user failed" };
    }
};

export const signup = (userData, createdByBanker = false) => async (dispatch) => {
    const { firstName, lastName, username, email, mobile, password, role } = userData; 
    try {
        const res = await csrfFetch('/api/users', {
            method: 'POST',
            body: JSON.stringify({
                firstName, lastName, username, email, mobile, password,
                role: role || 'standard',
                meta_createdByBanker: createdByBanker
            })
        });

        const data = await res.json(); 
        if (data.user && !createdByBanker) {
            dispatch(addUserSession(data.user));
        }
        return data;

    } catch (error) {
        const errorData = await error.json();
        console.error("Signup thunk error:", errorData);
        throw errorData;
    }
};

export const logOutCurrUser = () => async (dispatch) => {
    try {
        await csrfFetch('/api/session', { method: 'DELETE' });
        dispatch(removeUserSession());
    } catch (error) {
        const errorData = await error.json();
        console.error("Logout failed:", errorData);
    }
};

// NEW AUTH RECOVERY FUNCTIONS

export const requestPasswordReset = (email) => async () => {
    console.log('requestPasswordReset called with email:', email);
    try {
        const res = await csrfFetch('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
        const data = await res.json();
        return data;

    } catch (error) {
        const errorData = await error.json();
        throw errorData;
    }
};

export const requestUsernameRecovery = (mobile) => async () => {
    try {
        const res = await csrfFetch('/api/auth/forgot-username', {
            method: 'POST',
            body: JSON.stringify({ mobile })
        });
        
        const data = await res.json();
        return data;

    } catch (error) {
        const errorData = await error.json();
        throw errorData;
    }
};

export const resetPassword = (token, password) => async () => {
    try {
        const res = await csrfFetch('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password })
        });
        
        const data = await res.json();
        return data;

    } catch (error) {
        const errorData = await error.json();
        throw errorData;
    }
};

export const verifyResetToken = (token) => async () => {
    try {
        const res = await csrfFetch(`/api/auth/verify-reset-token/${token}`);
        const data = await res.json();
        return data;

    } catch (error) {
        const errorData = await error.json();
        throw errorData;
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