import { csrfFetch } from "./csrf";



export const GET_ALL_USERS_START = 'users/GET_ALL_USERS_START';
export const GET_ALL_USERS_SUCCESS = 'users/GET_ALL_USERS_SUCCESS';
export const GET_ALL_USERS_FAILURE = 'users/GET_ALL_USERS_FAILURE';

const GET_USER_BY_Id_START ='users/GET_USER_BY_Id_START';
const GET_USER_BY_Id_SUCCESS = 'users/GET_USER_BY_Id_SUCCESS';
const GET_USER_BY_Id_FAILURE = 'users/GET_USER_BY_Id_FAILURE';

const DELETE_USER_BY_ID_START = 'users/DELETE_USER_BY_ID_START';
const DELETE_USER_BY_ID_SUCCESS = 'users/DELETE_USER_BY_ID_SUCCESS';
const DELETE_USER_BY_ID_FAILURE = 'users/DELETE_USER_BY_ID_FAILURE';

// const REMOVE_USER_FROM_POT_BY_ID = 'users/REMOVE_USER_FROM_POT_BY_ID';


//--action creators--

//get all users
const getAllUsersStart = () => ({type: GET_ALL_USERS_START});
const getAllUsersSuccess = (usersData) => ({type: GET_ALL_USERS_SUCCESS, payload: usersData});
const getAllUsersFailure = (error) => ({type: GET_ALL_USERS_FAILURE, payload: error});


//get user by id

const getUserByIdStart = (userId) => ({type: GET_USER_BY_Id_START, payload: userId});
const getUserByIdSuccess = (userData) => ({type: GET_USER_BY_Id_SUCCESS, payload: userData});
const getUserByIdFailure = (error) => ({type: GET_USER_BY_Id_FAILURE, payload: error}) ;

//delete user by id
const deleteUserByIdStart = (userId)=> ({type: DELETE_USER_BY_ID_START, payload: userId});
const deleteUserByIdSuccess = (userId) => ({type: DELETE_USER_BY_ID_SUCCESS, payload: userId});
const deleteUserByIdFailure = (error) => ({type: DELETE_USER_BY_ID_FAILURE, payload: error});



//--thunks--

//get all users
export const getAllUsers = ()=> async (dispatch) => {
    dispatch(getAllUsersStart());
    try{
        const res = await csrfFetch('/api/users');
        if(!res.ok){
            const errorData = await res.json().catch(()=>({message: res.statusText}));
            throw new Error(errorData.message || 'Could not get users');
        }
        
        const userData =  await res.json();
        dispatch(getAllUsersSuccess(userData));
    }catch(error){
        dispatch(getAllUsersFailure(error.message));
    }
};

//get user by id
export const getUserById = (userId)=> async (dispatch)=> {
    dispatch(getUserByIdStart(userId));
    try {
        const res = await csrfFetch(`/api/users/${userId}`);
        if(!res.ok){
            const errorData = await res.json().catch(()=> ({message: res.statusText}));
            throw new Error(errorData.message || 'Could not get user');
        };
        const userData = await res.json();
        dispatch(getUserByIdSuccess(userData));
    }catch(error){
        dispatch(getUserByIdFailure(error.message));
    };
};

//delete user by id

export const deleteUserById = (userId) => async (dispatch) => {
    dispatch(deleteUserByIdStart(userId));

    try {
        const res = await csrfFetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        
        if(!res.ok){
            const errorData = await res.json().catch(()=> ({message: res.statusText}));
            throw new Error(errorData.message || 'Could not delete user');
        }
        const data = await res.json();
        dispatch(deleteUserByIdSuccess(userId));
    }catch(error){
        dispatch(deleteUserByIdFailure(error.message));
    };
};

const initialState = {
    allUsers: {},
    userById: {}
};

const usersReducer = (state = initialState, action) => {
        switch(action.type){
            case GET_ALL_USERS_START: {
                return {...state};
            }
            case GET_ALL_USERS_SUCCESS: {
                const newAllUsers = {}
                if (action.payload && action.payload.Users ) {
                    action.payload.Users.forEach(user => {
                        newAllUsers[user.id] = user
                    });
                };
                return {...state, allUsers: newAllUsers};
            }
            case GET_ALL_USERS_FAILURE: {
                console.error('Error fetching users:', action.payload);
                return {...state};
            }
            case GET_USER_BY_Id_START : {
                return {...state};
            }
            case GET_USER_BY_Id_SUCCESS : {
                return {...state, userById: action.payload};    
            }
            case GET_USER_BY_Id_FAILURE : {
                console.error('Error fetching user by ID:', action.payload);
                return {...state};
            }
            case DELETE_USER_BY_ID_START: {
                return {...state};
            }
            case DELETE_USER_BY_ID_SUCCESS: {
                const newState = {...state};
                const updatedAllUsers = {...newState.allUsers};
                delete updatedAllUsers[action.payload];
                return {...newState, allUsers: updatedAllUsers};
            }
            case DELETE_USER_BY_ID_FAILURE:
                console.error('Error deleting user by id', action.payload);
                return {...state};
            default:
                return state;
        };
};



export default usersReducer;