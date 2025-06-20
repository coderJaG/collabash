
import { useState } from "react";
import { useModal } from '../context/Modal';


import './AddUserToPot.css'


const AddUsersToPot = ({
    currentPotUsers,
    onSave,
    availableUsers,
    isSavingUsers
}) => {


    const [selectedUserById, setSelectedUserById] = useState('');
    const [error, setError] = useState(null);

    const { closeModal } = useModal();

    const handleSelectChange = async (e) => {
        e.preventDefault();
        setSelectedUserById(e.target.value);
        setError(null); // Reset error when a new user is selected
    };

    //handle saving user change
    const handleSaveChanges = async () => {
        if (!selectedUserById) {
            setError('Please select a user')
            return;
        }

        const alreadyInPot = currentPotUsers.some(user => user.id.toString() === selectedUserById);

        if (!alreadyInPot) {
            try {
                await onSave(selectedUserById);
                closeModal()
            } catch (saveError) {
                console.error("Error saving user from modal:", saveError);
                setError("Failed to add user. Please try again.");
            }
        } else {
            setError('User already exists');
        }
    };


    const handleCancel = () => {
        closeModal();
        setError(null); 
        setSelectedUserById(''); 
    };

    //convert allUsers to an array
    // users to display in dropdown
    const usersToDisplay = Array.isArray(availableUsers)
        ? availableUsers.filter(newUser => {
            return !currentPotUsers.some(potUser => potUser.id === newUser.id)
        }) : [];
    //logic to disable the save button
    const isSelectedUserAlreadyInPot = selectedUserById
        ? currentPotUsers.some(user => user.id.toString() === selectedUserById) : false;
    return (

        <div className="add-user-to-pot-content">
            <h1>ALL USERS</h1>
            <label htmlFor='user-select'>Add New User: </label>
            <select
                id='user-select'
                value={selectedUserById}
                onChange={handleSelectChange}
            >
                <option value=''>Select New User</option>
                {
                    usersToDisplay.length > 0 ? (usersToDisplay.map(user => (
                        <option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} -- {user.mobile}
                        </option>
                    ))
                    ) : (
                        <option value='' disabled>No User Available For Selection</option>
                    )}
            </select>
            {error && <p className="error-message">{error}</p>}
            <div className="modal-actions">
                <button
                    onClick={handleSaveChanges}
                    className="modal-button save"
                    disabled={isSavingUsers || !selectedUserById || isSelectedUserAlreadyInPot || usersToDisplay.length === 0}
                >
                    {isSavingUsers ? 'Saving...' : 'Save User'}
                </button>
                <button
                    onClick={handleCancel}
                    className="modal-button cancel"
                    disabled={isSavingUsers}
                >
                    Cancel
                </button>
            </div>
        </div>

    )
}


export default AddUsersToPot;