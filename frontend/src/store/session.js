import { csrfFetch } from './csrf'

const ADD_USER_SESSION = 'session/addUserSession';
const REMOVE_USER_SESSSION = 'sessio/removeUserSession';

const addUserSession = (user) => ({
    type: ADD_USER_SESSION,
    payload: user
});

const removeUserSession = () => ({
    type: REMOVE_USER_SESSSION
});


export const login = (user) => async (dispatch) => {
    const { credential, password } = user;
    let res = await csrfFetch('/api/session', {
        method: 'POST',
        body: JSON.stringify({
            credential,
            password
        })
    });
    const data = await res.json();
    dispatch(addUserSession(data.user))
    return res
};

export const restoreUser = () => async (dispatch) => {
    let res = await csrfFetch('/api/session');
    const data = await res.json();
    dispatch(addUserSession(data.user));
    return res;
}

export const signUp = (user) => async (dispatch) => {
    const { firstName, lastName, username, email, mobile, handPaid, drawDate, gotDraw, password, role } = user;
    let res = await csrfFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
            firstName,
            lastName,
            username,
            email,
            mobile,
            handPaid,
            drawDate,
            gotDraw,
            password,
            role
        })
    });
    const data = await res.json()
    dispatch(addUserSession(data.user));
    return res;
}



export const logOutCurrUser = () => async (dispatch) => {
    let res = await csrfFetch('/api/session', {
        method: 'DELETE'
    });

    dispatch(removeUserSession())
    return res
}
const initialState = { user: null };

const sessionReducer = (state = initialState, action) => {
    switch (action.type) {
        case ADD_USER_SESSION: {
            return { ...state, user: action.payload }
        }
        case REMOVE_USER_SESSSION: {
            return { ...state, user: null }
        }
        default:
            return state
    }
}

export default sessionReducer;