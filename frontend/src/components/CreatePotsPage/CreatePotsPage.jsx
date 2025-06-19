import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import * as potsActions from '../../store/pots';
import * as usersActions from '../../store/users';
import LoadingSpinner from '../LoadingSpinner';
import OpenModalButton from '../OpenModalButton';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import './CreatePotsPage.css';

const CreatePotsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const allUsers = useSelector(state => state.users.allUsers);
    const isLoadingUsers = useSelector(state => state.users.isLoadingAllUsers);
    const isCreatingPot = useSelector(state => state.pots.isCreating);
    const createError = useSelector(state => state.pots.errorCreate);

    const [name, setName] = useState('');
    const [hand, setHand] = useState('');
    const [startDate, setStartDate] = useState('');
    const [frequency, setFrequency] = useState('weekly');
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const duplicateData = location.state?.duplicateData;
        if (duplicateData) {
            setName(duplicateData.name || '');
            setHand(duplicateData.hand !== undefined ? duplicateData.hand.toString() : '0');
            setFrequency(duplicateData.frequency || 'weekly'); 
            if (duplicateData.userIds) {
                setSelectedUserIds(new Set(duplicateData.userIds));
            }
        }
    }, [location.state]);

    useEffect(() => {
        dispatch(usersActions.getAllUsers());
    }, [dispatch]);

    const usersArray = useMemo(() => Object.values(allUsers || {}), [allUsers]);
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return usersArray;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return usersArray.filter(user =>
            (`${user.firstName} ${user.lastName}`.toLowerCase().includes(lowerSearchTerm)) ||
            (user.username?.toLowerCase().includes(lowerSearchTerm))
        );
    }, [usersArray, searchTerm]);

    const handleUserSelection = (userId) => {
        const newSelectedUserIds = new Set(selectedUserIds);
        if (newSelectedUserIds.has(userId)) {
            newSelectedUserIds.delete(userId);
        } else {
            newSelectedUserIds.add(userId);
        }
        setSelectedUserIds(newSelectedUserIds);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        const validationErrors = {};
        if (!name.trim()) validationErrors.name = 'Pot name is required.';
        if (!startDate) validationErrors.startDate = 'Start date is required.';
        const handNum = parseFloat(hand);
        if (isNaN(handNum) || handNum < 0) validationErrors.hand = 'Amount per hand must be a valid number (0 or greater).';
        if (selectedUserIds.size === 0) validationErrors.users = 'You must select at least one member.';
        
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const potData = {
            name,
            hand: handNum,
            startDate,
            frequency,
            userIds: Array.from(selectedUserIds),
        };

        try {
            const newPot = await dispatch(potsActions.createNewPot(potData));
            if (newPot && newPot.id) {
                navigate(`/pots/${newPot.id}`);
            }
        } catch (error) {
            console.error("Failed to create pot:", error);
        }
    };
    
    return (
        <div className="create-pot-page-wrapper">
            <h1 className="create-pot-header">{location.state?.duplicateData ? 'DUPLICATE POT' : 'CREATE A NEW POT'}</h1>
            {createError && <p className="error-message">{createError.message || "An error occurred."}</p>}
            
            <form onSubmit={handleSubmit} className="create-pot-form">
                <div className="form-section">
                    <div className="form-group">
                        <label htmlFor="name">Pot Name</label>
                        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
                        {errors.name && <p className="validation-error">{errors.name}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="hand">Amount per Hand ($)</label>
                        <input id="hand" type="number" value={hand} onChange={(e) => setHand(e.target.value)} placeholder="0.00" />
                        {errors.hand && <p className="validation-error">{errors.hand}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="startDate">Start Date</label>
                        <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        {errors.startDate && <p className="validation-error">{errors.startDate}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="frequency">Draw Frequency</label>
                        <select id="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                            <option value="weekly">Weekly</option>
                            <option value="every-2-weeks">Every 2 Weeks</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                </div>

                <div className="form-section members-selection">
                    <h3>Select Members ({selectedUserIds.size} selected)</h3>
                    {errors.users && <p className="validation-error">{errors.users}</p>}
                    <input type="text" placeholder="Search for users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="user-search-input"/>
                    
                    {isLoadingUsers ? <LoadingSpinner message="Loading users..." /> : (
                        <div className="user-list">
                            {filteredUsers.map(user => (
                                <div key={user.id} className="user-list-item">
                                    <input
                                        type="checkbox"
                                        id={`user-${user.id}`}
                                        checked={selectedUserIds.has(user.id)}
                                        onChange={() => handleUserSelection(user.id)}
                                    />
                                    <label htmlFor={`user-${user.id}`}>{user.firstName} {user.lastName} ({user.username})</label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="form-actions">
                    <div className="cancel-button-wrapper">
                         <OpenModalButton
                            buttonText="Cancel"
                            modalComponent={
                                <DeleteConfirmationModal
                                    message="Are you sure you want to cancel? Any unsaved changes will be lost."
                                    onConfirm={() => navigate('/pots')}
                                    confirmButtonText="Yes, Discard"
                                    cancelButtonText="No, Continue Editing"
                                />
                            }
                        />
                    </div>
                    <button type="submit" disabled={isCreatingPot} className="submit-button">
                        {isCreatingPot ? 'Creating...' : 'Create Pot'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreatePotsPage;