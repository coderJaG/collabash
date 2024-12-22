
import { csrfFetch } from "./csrf";

const GET_ALL_POTS = 'pots/getAllPots';
const GET_POT_BY_ID = 'pots/getPotById';
const ADD_NEW_POT = 'pots/addNewPot';
const REMOVE_POT = 'pots/removePot';
const UPDATE_POT = 'pots/updatePot';

//get all pots thunk
const getAllPots = (pot) => ({
    type: GET_ALL_POTS,
    payload: pot
})


//get pot by id thunk
const getPotById = (pot) => ({
    type: GET_POT_BY_ID,
    payload: pot
})

//create new pot thunk
const addNewPot = (pot) => ({
    type: ADD_NEW_POT,
    payload: pot
})


//update a pot thunk
const updatePot = (pot) => ({
    type: UPDATE_POT,
    payload: pot
})

//delete a pot thunk
const removePot = (potId) => ({
    type: REMOVE_POT,
    payload: potId
});

//get all pots actionthunk
export const getPots = () => async (dispatch) => {
    const res = await csrfFetch('/api/pots');
    const data = await res.json();
    dispatch(getAllPots(data));
    return data;
}

//create new pot action thunk
export const createNewPot = (potdata) => async (dispatch) => {
    const { ownerId, name, amount, startDate, endDate, active } = potdata;
    let res = await csrfFetch('/api/pots', {
        method: 'POST',
        body: JSON.stringify({
            ownerId,
            name,
            amount,
            startDate,
            endDate,
            active
        }),

    })
    const data = await res.json()
    dispatch(addNewPot(data))
    return data
};

//update a pot action thunk
export const updateAPot = (potdata, potId) => async (dispatch) => {
    const { name, amount } = potdata;
    let res = await csrfFetch(`/api/pots/${potId}`, {
        method: 'PUT',
        body: JSON.stringify({
            name,
            amount
        })
    });
    const data = await res.json()
    dispatch(updatePot(data));
    return data;
};

//get pot by id action thunk
export const getAPotById = (spotId) => async (dispatch) => {
    const res = await csrfFetch(`/api/pots/${spotId}`);
    const data = await res.json();
    dispatch(getPotById(data));
    return data;
};

export const deletePot = (spotId) => async (dispatch) => {
    const res = await csrfFetch(`/api/pots/${spotId}`, {
        method: 'DELETE'
    });
    dispatch(removePot(spotId));
    return res;
};


const initialState = {};
const potsReducer = (state = initialState, action) => {
    let newState;
    switch (action.type) {
        case ADD_NEW_POT: {
            return { ...state, pot: action.payload }
        }
        case UPDATE_POT: {
            return { ...state, pot: action.payload }
        }
        case GET_ALL_POTS: {
            newState = { ...state };
            action.payload.Pots.forEach(pot => {
                newState[pot.id] = pot;
            });
            return newState
        }
        case GET_POT_BY_ID: {
            return { ...state, pot: action.payload }
        }
        case REMOVE_POT: {
            newState = { ...state }
            delete newState[action.payload]
            return newState
        }
        default: {
            return state
        }
    }
};

export default potsReducer;