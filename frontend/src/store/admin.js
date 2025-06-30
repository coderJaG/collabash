//store/admin.js

import { csrfFetch } from "./csrf";
import { toast } from 'react-toastify';

// --- ACTION TYPES ---
const GET_PAYMENT_REPORT_START = 'admin/GET_PAYMENT_REPORT_START';
const GET_PAYMENT_REPORT_SUCCESS = 'admin/GET_PAYMENT_REPORT_SUCCESS';
const GET_PAYMENT_REPORT_FAILURE = 'admin/GET_PAYMENT_REPORT_FAILURE';

const UPDATE_PAYMENT_STATUS_START = 'admin/UPDATE_PAYMENT_STATUS_START';
const UPDATE_PAYMENT_STATUS_SUCCESS = 'admin/UPDATE_PAYMENT_STATUS_SUCCESS';
const UPDATE_PAYMENT_STATUS_FAILURE = 'admin/UPDATE_PAYMENT_STATUS_FAILURE';

const UPDATE_BANKER_STATUS_START = 'admin/UPDATE_BANKER_STATUS_START';
const UPDATE_BANKER_STATUS_SUCCESS = 'admin/UPDATE_BANKER_STATUS_SUCCESS';
const UPDATE_BANKER_STATUS_FAILURE = 'admin/UPDATE_BANKER_STATUS_FAILURE';


// --- ACTION CREATORS ---
const getPaymentReportStart = () => ({ type: GET_PAYMENT_REPORT_START });
const getPaymentReportSuccess = (payments) => ({ type: GET_PAYMENT_REPORT_SUCCESS, payload: payments });
const getPaymentReportFailure = (error) => ({ type: GET_PAYMENT_REPORT_FAILURE, payload: error });

const updatePaymentStatusStart = () => ({ type: UPDATE_PAYMENT_STATUS_START });
const updatePaymentStatusSuccess = (payment) => ({ type: UPDATE_PAYMENT_STATUS_SUCCESS, payload: payment });
const updatePaymentStatusFailure = (error) => ({ type: UPDATE_PAYMENT_STATUS_FAILURE, payload: error });

const updateBankerStatusStart = () => ({ type: UPDATE_BANKER_STATUS_START });
const updateBankerStatusSuccess = (user) => ({ type: UPDATE_BANKER_STATUS_SUCCESS, payload: user });
const updateBankerStatusFailure = (error) => ({ type: UPDATE_BANKER_STATUS_FAILURE, payload: error });


// --- THUNKS ---
export const fetchPaymentReport = () => async (dispatch) => {
    dispatch(getPaymentReportStart());
    try {
        const res = await csrfFetch('/api/admin/payments');
        const data = await res.json();
        if (!res.ok) throw data;
        dispatch(getPaymentReportSuccess(data.payments));
    } catch (error) {
        dispatch(getPaymentReportFailure(error.message || "Failed to fetch reports."));
        toast.error(error.message || "Failed to fetch reports.");
    }
};

export const markPaymentAsPaid = (paymentId) => async (dispatch) => {
    dispatch(updatePaymentStatusStart());
    try {
        const res = await csrfFetch(`/api/admin/payments/${paymentId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'paid' })
        });
        const data = await res.json();
        if (!res.ok) throw data;
        dispatch(updatePaymentStatusSuccess(data));
        toast.success("Payment marked as paid!");
    } catch (error) {
        dispatch(updatePaymentStatusFailure(error.message || "Failed to update payment."));
        toast.error(error.message || "Failed to update payment.");
    }
};

export const updateUserStatus = (userId, newRole) => async (dispatch) => {
    dispatch(updateBankerStatusStart());
    try {
        const res = await csrfFetch(`/api/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole })
        });
        const data = await res.json();
        if (!res.ok) throw data;
        dispatch(updateBankerStatusSuccess(data));
        toast.success(`User status updated to ${newRole}.`);
        dispatch(usersActions.getAllUsers());
    } catch (error) {
        dispatch(updateBankerStatusFailure(error.message || "Failed to update user status."));
        toast.error(error.message || "Failed to update user status.");
    }
};


// --- REDUCER ---
const initialState = {
    payments: {},
    isLoading: false,
    error: null,
};

const adminReducer = (state = initialState, action) => {
    switch (action.type) {
        case GET_PAYMENT_REPORT_START:
        case UPDATE_PAYMENT_STATUS_START:
        case UPDATE_BANKER_STATUS_START:
            return { ...state, isLoading: true, error: null };
        
        case GET_PAYMENT_REPORT_SUCCESS:
            const newPayments = {};
            action.payload.forEach(p => { newPayments[p.id] = p; });
            return { ...state, isLoading: false, payments: newPayments };
            
        case UPDATE_PAYMENT_STATUS_SUCCESS:
            return {
                ...state,
                isLoading: false,
                payments: { ...state.payments, [action.payload.id]: action.payload }
            };

        case UPDATE_BANKER_STATUS_SUCCESS:
            // This action doesn't directly affect the payments state, but we stop loading.
            return { ...state, isLoading: false };
            
        case GET_PAYMENT_REPORT_FAILURE:
        case UPDATE_PAYMENT_STATUS_FAILURE:
        case UPDATE_BANKER_STATUS_FAILURE:
            return { ...state, isLoading: false, error: action.payload };

        default:
            return state;
    }
};

export default adminReducer;
