import React from 'react';
import { useModal } from '../context/Modal';
import './SuspendConfirmationModal.css';

function SuspendConfirmationModal({ bankerName, onConfirm }) {
    const { closeModal } = useModal();

    const handleConfirm = () => {
        onConfirm();
        closeModal();
    };

    return (
        <div className="suspend-modal-container">
            <h2>Confirm Suspension</h2>
            <p>
                Are you sure you want to suspend the banker, <strong>{bankerName}</strong>?
                <br />
                Their access will be revoked until they are reactivated.
            </p>
            <div className="suspend-modal-buttons">
                <button onClick={closeModal} className="cancel-button">Cancel</button>
                <button onClick={handleConfirm} className="confirm-suspend-button">Yes, Suspend Banker</button>
            </div>
        </div>
    );
}

export default SuspendConfirmationModal;