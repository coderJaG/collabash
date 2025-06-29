import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { MultiBackend } from 'react-dnd-multi-backend';
import { HTML5toTouch } from 'rdndmb-html5-to-touch';
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

// Custom mobile-friendly DnD configuration
const mobileOptimizedOptions = {
    backends: [
        {
            id: 'html5',
            backend: HTML5toTouch.backends[0].backend,
            transition: HTML5toTouch.backends[0].transition,
        },
        {
            id: 'touch',
            backend: HTML5toTouch.backends[1].backend,
            options: {
                enableMouseEvents: true,
                delayTouchStart: 100, // Shorter delay for quicker drag recognition
                delayMouseStart: 0,
                touchSlop: 8, // Much smaller tolerance - prioritize drag over scroll
                ignoreContextMenu: true,
                enableTouchEvents: true,
                enableKeyboardEvents: false,
                // Allow the drag handle to capture touch events
                preventScrolling: true, // Re-enable for better drag capture
            },
            preview: true,
            transition: HTML5toTouch.backends[1].transition,
        },
    ],
};

if (import.meta.env.MODE !== 'production') {
  restoreCSRF();
  window.csrfFetch = csrfFetch;
  window.store = store;
  window.sessionActions = sessionActions;
  window.potsActions = potsActions;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <DndProvider backend={MultiBackend} options={mobileOptimizedOptions}>
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