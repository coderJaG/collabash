
import { csrfFetch } from './csrf';

const FETCH_WEEKLY_STATUS_START = 'transactions/FETCH_WEEKLY_STATUS_START';
const FETCH_WEEKLY_STATUS_SUCCESS = 'transactions/FETCH_WEEKLY_STATUS_SUCCESS';
const FETCH_WEEKLY_STATUS_FAILURE = 'transactions/FETCH_WEEKLY_STATUS_FAILURE';
const UPDATE_WEEKLY_PAYMENT_SUCCESS = 'transactions/UPDATE_WEEKLY_PAYMENT_SUCCESS';

const REMOVE_TRANSACTION_START = 'transactions/REMOVE_TRANSACTION_START';
const REMOVE_TRANSACTION_SUCCESS = 'transactions/REMOVE_TRANSACTION_SUCCESS';
const REMOVE_TRANSACTION_FAILURE = 'transactions/REMOVE_TRANSACTION_FAILURE';

// --- Action Creators ---


const fetchWeeklyStatusStart = (potId, weekNumber) => ({ type: FETCH_WEEKLY_STATUS_START, payload: { potId, weekNumber } });
const fetchWeeklyStatusSuccess = (potId, weekNumber, data) => ({ type: FETCH_WEEKLY_STATUS_SUCCESS, payload: { potId, weekNumber, data } });
const fetchWeeklyStatusFailure = (potId, weekNumber, error) => ({ type: FETCH_WEEKLY_STATUS_FAILURE, payload: { potId, weekNumber, error } });
const updateWeeklyPaymentSuccess = (updatedTransaction) => ({ type: UPDATE_WEEKLY_PAYMENT_SUCCESS, payload: updatedTransaction });

const removeTransactionStart = () => ({ type: REMOVE_TRANSACTION_START });
const removeTransactionSuccess = (potId, userId) => ({ type: REMOVE_TRANSACTION_SUCCESS, payload: { potId, userId } });
const removeTransactionFailure = (error) => ({ type: REMOVE_TRANSACTION_FAILURE, payload: { error } });

// --- Thunks ---

export const fetchWeeklyStatus = (potId, weekNumber) => async (dispatch) => {
    dispatch(fetchWeeklyStatusStart(potId, weekNumber));
    try {
        // Construct URL with weekNumber as a query parameter
        const url = `/api/transactions/pot/${potId}?weekNumber=${weekNumber}`;
        console.log("Fetching weekly status from URL:", url); // Log the URL being fetched

        const res = await csrfFetch(url);

        if (!res.ok) {
            throw new Error(data.message || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        dispatch(fetchWeeklyStatusSuccess(potId, weekNumber, data));

    } catch (error) {
        console.error(`Error fetching weekly status for pot ${potId}, week ${weekNumber}:`, error);
        dispatch(fetchWeeklyStatusFailure(potId, weekNumber, error.message || "Failed to fetch weekly data."));
    }
};

// Update weekly payment thunk
export const updateWeeklyPayment = (transactionData) => async (dispatch) => {
    const { potId, userId, weekNumber, paymentType, isPaid } = transactionData;
    try {
        const res = await csrfFetch(`/api/transactions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ potId, userId, weekNumber, paymentType, isPaid }),
        });
        if (!res.ok) {
            throw new Error(updatedTransaction.message || `HTTP error! status: ${res.status}`);
        }
        const updatedTransaction = await res.json();
        dispatch(updateWeeklyPaymentSuccess(updatedTransaction));
    } catch (error) {
        console.error("Error updating transaction:", error);
        dispatch(fetchWeeklyStatusFailure(potId, weekNumber, `Failed to update payment for user ${userId}: ${error.message}`));
    }
};

// Remove transaction thunk
export const removeTransaction = (potId, userId) => async (dispatch) => {
    dispatch(removeTransactionStart());
    try {
        const res = await csrfFetch(`/api/transactions/`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ potId, userId })
        });
        if (!res.ok) {
            throw new Error(data.message || `HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        dispatch(removeTransactionSuccess(potId, userId));
    } catch (error) {
        dispatch(removeTransactionFailure(error.message || "Failed to remove transaction."));
    }
};
// --- Reducer ---
// Initial state


const initialState = {
    weeklyStatusByPot: {},
    loadingWeeklyStatus: {},
    errorWeeklyStatus: {},
    removingTransaction: false,
    removeTransactionError: null
};
const transactionsReducer = (state = initialState, action) => {
    let potId, weekNumber, key;
    switch (action.type) {
        case FETCH_WEEKLY_STATUS_START:
            potId = action.payload.potId;
            weekNumber = action.payload.weekNumber;
            key = `${potId}_${weekNumber}`;
            return {
                ...state, loadingWeeklyStatus: {
                    ...state.loadingWeeklyStatus,
                    [key]: true
                },
                errorWeeklyStatus: {
                    ...state.errorWeeklyStatus,
                    [key]: null
                }
            };
        case FETCH_WEEKLY_STATUS_SUCCESS:
            potId = action.payload.potId;
            weekNumber = action.payload.weekNumber;
            key = `${potId}_${weekNumber}`;
            return {
                ...state,
                weeklyStatusByPot: {
                    ...state.weeklyStatusByPot,
                    [potId]: {
                        ...state.weeklyStatusByPot[potId],
                        [weekNumber]: action.payload.data
                    }
                },
                loadingWeeklyStatus: {
                    ...state.loadingWeeklyStatus,
                    [key]: false

                },
                errorWeeklyStatus: {
                    ...state.errorWeeklyStatus,
                    [key]: null
                }
            };
        case FETCH_WEEKLY_STATUS_FAILURE:
            potId = action.payload.potId;
            weekNumber = action.payload.weekNumber;
            key = `${potId}_${weekNumber}`;
            return {
                ...state,
                loadingWeeklyStatus: {
                    ...state.loadingWeeklyStatus,
                    [key]: false

                },
                errorWeeklyStatus: {
                    ...state.errorWeeklyStatus,
                    [key]: action.payload.error
                }
            };
        case UPDATE_WEEKLY_PAYMENT_SUCCESS: {
            const { potId, userId, weekNumber, paidHand, gotDraw } = action.payload;
            const potData = state.weeklyStatusByPot[potId] || {}; const weekData = potData[weekNumber] || {}; const userData = weekData[userId] || {};
            return {
                ...state,
                weeklyStatusByPot: {
                    ...state.weeklyStatusByPot,
                    [potId]: {
                        ...potData,
                        [weekNumber]: {
                            ...weekData,
                            [userId]: {
                                ...userData,
                                paidHand: paidHand,
                                gotDraw: gotDraw
                            }
                        }
                    }
                }
            };
        }
        case REMOVE_TRANSACTION_START:
            return {
                ...state,
                loadingWeeklyStatus: {
                    ...state.loadingWeeklyStatus,
                    removingTransaction: true
                }
            };
        case REMOVE_TRANSACTION_SUCCESS: {
            potId = action.payload.potId;
            const updatedWeeklyStatus = { ...state.weeklyStatusByPot };
            delete updatedWeeklyStatus[potId];
            return {
                ...state,
                weeklyStatusByPot: updatedWeeklyStatus,
                loadingWeeklyStatus: {
                    ...state.loadingWeeklyStatus,
                    removingTransaction: false
                }
            };
        }
        case REMOVE_TRANSACTION_FAILURE:
            return {
                ...state,
                loadingWeeklyStatus: {
                    ...state.loadingWeeklyStatus,
                    removingTransaction: false
                },
                errorWeeklyStatus: {
                    ...state.errorWeeklyStatus,
                    removeTransactionError: action.payload.error
                }
            };
        default: return state;
    }
};

export default transactionsReducer;