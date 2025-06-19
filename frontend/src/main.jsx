import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ToastContainer } from 'react-toastify'; // Import ToastContainer
import 'react-toastify/dist/ReactToastify.css'; // Import the CSS

import App from './App';
import './index.css';
import configureStore from './store';
import { restoreCSRF, csrfFetch } from './store/csrf';
import * as sessionActions from './store/session';
import * as potsActions from './store/pots';
import { Modal, ModalProvider } from './components/context/Modal';
import { SocketProvider } from './context/SocketContext'; // Import the SocketProvider

const store = configureStore();

if (import.meta.env.MODE !== 'production') {
  restoreCSRF();
  window.csrfFetch = csrfFetch;
  window.store = store;
  window.sessionActions = sessionActions;
  window.potsActions = potsActions;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <DndProvider backend={HTML5Backend}>
    <React.StrictMode>
      <ModalProvider>
        <Provider store={store}>
          <SocketProvider>
            <App />
            <ToastContainer // Add ToastContainer here for notifications
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored"
            />
            <Modal />
          </SocketProvider>
        </Provider>
      </ModalProvider>
    </React.StrictMode>
  </DndProvider>
);