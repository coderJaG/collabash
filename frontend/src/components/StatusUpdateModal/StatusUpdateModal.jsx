
import { useState } from 'react';
import { useModal } from '../context/Modal';

import './StatusModalUpdate.css'




const StatusUpdateModal = ({
    currentStatus,
    onSave,
    availableStatuses,
    isSavingStatus
}) => {

    const { closeModal } = useModal()

    // Internal state for the new status selected in the dropdown
    const [selectedStatus, setSelectedStatus] = useState('');

    // Effect to update internal state if currentPotStatus prop changes
    // (e.g., if the modal could somehow re-render with new props while open, though less common)

    //commented out to ensure 'Select New status' is shown by default in modal
    // useEffect(() => {
    //     setSelectedStatus(currentStatus || '')
    // }, [currentStatus]);

    const handleSelectChange = async (e) => {
        setSelectedStatus(e.target.value);
    };

    //handle saving status change
    const handleSaveChanges = async () => {
        if (selectedStatus && selectedStatus !== currentStatus) {
            await onSave(selectedStatus);
        }
        closeModal();
    };

    const handleCancel = () => {
        closeModal();
    }

    return (
        <>
            <div className='modal-overlay'>
                <div className='modal-content'>
                    <h2>Change Pot Status</h2>
                    <p> Current Status: <strong>{currentStatus}</strong></p>

                    <div className='status-options'>
                        <label htmlFor='status-select'>New Status:</label>
                        <select
                            id='status-select'
                            value={selectedStatus}
                            onChange={handleSelectChange}
                        >
                            <option value='' disabled={!!currentStatus}>Select new status</option>
                            {
                                Array.isArray(availableStatuses) && availableStatuses.map(status => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))
                            }
                        </select>

                    </div>
                    <div className="modal-actions">
                        <button
                            onClick={handleSaveChanges}
                            className="modal-button save"
                            disabled={isSavingStatus || !selectedStatus || selectedStatus === currentStatus}
                        >
                            {isSavingStatus ? 'Saving...' : 'Save Status'}
                        </button>
                        <button
                            onClick={handleCancel}
                            className="modal-button cancel"
                            disabled={isSavingStatus}
                        >
                            Cancel
                        </button>
                    </div>
                </div>

            </div>
        </>
    )
}









export default StatusUpdateModal