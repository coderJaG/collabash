import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import App from './App';
import './index.css';
import configureStore from './store';

import { restoreCSRF, csrfFetch } from './store/csrf';
import * as sessionActions from './store/session'
import * as potsActions from './store/pots'

import { Modal, ModalProvider } from './components/context/Modal';


// The /* @vite-ignore */ comment prevents Vite's dev server from trying to resolve this import.
if (import.meta.env.PROD) {
  const pwaRegisterModule = 'virtual:pwa-register';
  import(/* @vite-ignore */ pwaRegisterModule).then(({ registerSW }) => {
    const updateSW = registerSW({
      onNeedRefresh() {
        if (confirm("New content available. Reload?")) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.log("App is ready to work offline.");
      },
    });
  });
}

const store = configureStore();

if (import.meta.env.MODE !== 'production') {
  restoreCSRF();

  window.csrfFetch = csrfFetch;
  window.store = store;
  window.sessionActions = sessionActions
  window.potsActions = potsActions
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <DndProvider backend={HTML5Backend}>
    <React.StrictMode>
      <ModalProvider>
        <Provider store={store}>
          <App />
          <Modal />
        </Provider>
      </ModalProvider>
    </React.StrictMode>
  </DndProvider>
);