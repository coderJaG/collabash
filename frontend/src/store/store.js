import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import sessionReducer from './session';
import potsReducer from './pots';
import transactionsReducer from './transactions';
import usersReducer from './users';
import historyReducer from './history';
import requestsReducer from './requests';
import adminReducer from './admin';


const rootReducer = combineReducers({
  session: sessionReducer,
  pots: potsReducer,
  transactions: transactionsReducer,
  users: usersReducer,
  history: historyReducer,
  requests: requestsReducer,
  admin: adminReducer
});

let enhancer;
if (import.meta.env.MODE === "production") {
  enhancer = applyMiddleware(thunk);
} else {
  const logger = (await import("redux-logger")).default;
  const composeEnhancers =
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  enhancer = composeEnhancers(applyMiddleware(thunk, logger));
}

const configureStore = (preloadedState) => {
  return createStore(rootReducer, preloadedState, enhancer);
};

export default configureStore;