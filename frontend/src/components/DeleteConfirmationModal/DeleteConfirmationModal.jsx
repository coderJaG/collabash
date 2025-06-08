// DeleteConfirmationModal.jsx
import { useModal } from "../context/Modal";
import './DeleteConfirmationModal.css';

const DeleteConfirmationModal = ({
    message, // Generic message
    onConfirm, // Callback for "Yes"
    confirmButtonText = "Yes, Delete",
    cancelButtonText = "No, Cancel",
   
}) => {
    const { closeModal } = useModal();

    const handleYesClick = (e) => {
        e.preventDefault();
        if (typeof onConfirm === 'function') {
            onConfirm(); 
        }
        closeModal();
    };

    const handleNoClick = (e) => {
        e.preventDefault();
        closeModal();
    };

    return (
        <div className="delete-confirm-modal">
            <h3>Confirm Deletion</h3>
            <p>{message || 'Are you sure you want to proceed? This action cannot be undone.'}</p>
            <div className="confirm-actions">
                <button className="modal-button-confirm-delete" onClick={handleYesClick}>
                    {confirmButtonText}
                </button>
                <button className="modal-button-cancel-delete" onClick={handleNoClick}>
                    {cancelButtonText}
                </button>
            </div>
        </div>
    );
};
export default DeleteConfirmationModal;