import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState, useMemo, useCallback } from "react";
import { FaBars, FaEdit, FaSave, FaTimesCircle } from 'react-icons/fa';
import * as potsActions from '../../store/pots';
import * as usersActions from '../../store/users';
import { fetchWeeklyStatus, updateWeeklyPayment } from '../../store/transactions';
import { useNavigate, useParams } from "react-router-dom";
import OpenModalButton from "../OpenModalButton";
import StatusUpdateModal from "../StatusUpdateModal";
import AddUsersToPot from "../AddUserToPot";
import LoadingSpinner from "../LoadingSpinner";
import DraggableUserRow from '../DraggableUserRow';
import './PotDetailsPage.css';



const STABLE_EMPTY_OPJECT = Object.freeze({});

const formatDate = (dateStr) => { // dateStr is expected to be 'YYYY-MM-DD' from backend
    if (!dateStr) return 'N/A';

    // Split the 'YYYY-MM-DD' string to create a UTC date
    // This avoids issues where `new Date('YYYY-MM-DD')` might be interpreted differently by browsers.
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
        const day = parseInt(parts[2], 10);

        if (isNaN(year) || isNaN(month) || isNaN(day)) return 'Invalid Date Parts';
        
        // Create a Date object specifically for 00:00:00 UTC on that day
        const utcDate = new Date(Date.UTC(year, month, day));

        if (isNaN(utcDate.getTime())) return 'Invalid Date Object';

        // Format toLocaleDateString with timeZone:'UTC'.
        // Using 'en-US' for MM/DD/YYYY format.
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' };
        return utcDate.toLocaleDateString('en-US', options);
    }
    return 'Invalid Date Format'; // Fallback for unexpected format
};

const PotDetailsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { potId } = useParams();
    const numPotId = parseInt(potId, 10);

    const currUser = useSelector(state => state.session.user);
    const potDetails = useSelector(state => state.pots.currentPotDetails);
    const isLoading = useSelector(state => state.pots.isLoadingDetails);
    const error = useSelector(state => state.pots.errorDetails);
    const deletePotSuccess = useSelector(state => state.pots.deletePotSuccess);
    const isDeleting = useSelector(state => state.pots.isDeleting);
    const isUpdatingPot = useSelector(state => state.pots.isUpdating);
    const isReordering = useSelector(state => state.pots.isReorderingPotUsers); // Specific for reorder
    const reorderError = useSelector(state => state.pots.errorReorderingPotUsers);
    const allUsersForModal = useSelector(state => state.users.allUsers);

    const [currentWeek, setCurrentWeek] = useState(1);
    const [orderedUsers, setOrderedUsers] = useState([]);
    const [localUiError, setLocalUiError] = useState(null); // For UI feedback
    const [isUserActuallyDragging, setIsUserActuallyDragging] = useState(false); // Local DND drag state

    // State for inline editing
    const [isEditingAmount, setIsEditingAmount] = useState(false);
    const [editableAmount, setEditableAmount] = useState('');
    const [isEditingStartDate, setIsEditingStartDate] = useState(false);
    const [editableStartDate, setEditableStartDate] = useState('');


    useEffect(() => {
        // Sync local orderedUsers with Redux state (potDetails.Users)
        // only if not currently dragging and not currently saving a reorder to backend.
        if (!isUserActuallyDragging && !isReordering) {
            if (potDetails?.Users) {
                // Backend provide users sorted by displayOrder.
                // Create a new sorted array to avoid direct state mutation issues.
                const sortedUsersFromProps = [...potDetails.Users].sort((a, b) =>
                    (a.potMemberDetails?.displayOrder || Infinity) - (b.potMemberDetails?.displayOrder || Infinity)
                );
                // Only update if the incoming sorted list is different from the current local list.
                if (JSON.stringify(sortedUsersFromProps) !== JSON.stringify(orderedUsers)) {
                    setOrderedUsers(sortedUsersFromProps);
                }
            } else {
                setOrderedUsers([]);
            }
        }
    }, [potDetails?.Users, isReordering, isUserActuallyDragging, orderedUsers]); // Added orderedUsers to dependency for the stringify comparison

    // Effect to set initial editable values when potDetails loads
    useEffect(() => {
        if (potDetails) {
            setEditableAmount(potDetails.hand || '');
            // potDetails.startDate is expected to be 'YYYY-MM-DD' from the backend (DATEONLY)
            if (potDetails.startDate) {
                setEditableStartDate(potDetails.startDate);
            } else {
                setEditableStartDate(''); // Handle null or undefined startDate
            }
        }
    }, [potDetails]);


    const totalWeeks = orderedUsers.length || 0;
    const weeksForSelect = useMemo(() => Array.from({ length: totalWeeks }, (_, i) => i + 1), [totalWeeks]);

    const weeklyStatusMap = useSelector(state => state.transactions.weeklyStatusByPot[numPotId]?.[currentWeek] || STABLE_EMPTY_OPJECT);
    const weekLoadingKey = `${numPotId}_${currentWeek}`;
    const isLoadingWeek = useSelector(state => !!state.transactions.loadingWeeklyStatus[weekLoadingKey]);
    const weekError = useSelector(state => state.transactions.errorWeeklyStatus[weekLoadingKey]);

    useEffect(() => { dispatch(usersActions.getAllUsers()); }, [dispatch]);

    useEffect(() => {
        if (numPotId) {
            dispatch(potsActions.getAPotById(numPotId));
        }
        return () => {
            dispatch(potsActions.resetDeletePotStatus());
            dispatch(potsActions.clearPotReorderError());
            dispatch(potsActions.clearPotDetailsError()); // Also clear details error on unmount
        };
    }, [dispatch, numPotId]);

    useEffect(() => {
        if (numPotId && !isLoading && potDetails && totalWeeks > 0) {
            if (currentWeek > totalWeeks && totalWeeks > 0) setCurrentWeek(totalWeeks);
            else if (currentWeek < 1 && totalWeeks > 0) setCurrentWeek(1);
            else if (currentWeek >= 1 && currentWeek <= totalWeeks) dispatch(fetchWeeklyStatus(numPotId, currentWeek));
        } else if (totalWeeks === 0 && currentWeek !== 1) setCurrentWeek(1);
    }, [dispatch, numPotId, currentWeek, isLoading, potDetails, totalWeeks]);

    useEffect(() => { /* deletePotSuccess effect */
        let timerId;
        if (deletePotSuccess) {
            timerId = setTimeout(() => {
                navigate('/pots/');
                dispatch(potsActions.resetDeletePotStatus());
            }, 3000);
        }
        return () => clearTimeout(timerId);
    }, [deletePotSuccess, navigate, dispatch]);

    useEffect(() => { /* error effect for pot details loading */
        let timerId;
        if (error) { // This is state.pots.errorDetails
            timerId = setTimeout(() => {
                navigate('/pots/');
                dispatch(potsActions.clearPotDetailsError());
            }, 3000);
        }
        return () => clearTimeout(timerId);
    }, [error, navigate, dispatch]);


    const handlePaymentChange = (userId, week, paymentType, isPaid) => {
        const transactionData = { potId: numPotId, userId, week, paymentType, isPaid };
        dispatch(updateWeeklyPayment(transactionData));
    };
    const handleDeletePot = async (potIdToDelete) => {
        if (window.confirm("Are you sure you want to delete this pot? This action cannot be undone.")) {
            dispatch(potsActions.deletePot(potIdToDelete));
        }
    };
    const handleChangeStatus = async (newStatus) => {
        if (!potDetails || !newStatus) return;
        const potUpdateData = { status: newStatus };
        try {
            await dispatch(potsActions.updateAPot(potUpdateData, numPotId));
        } catch (updateError) {
            console.error("Failed to update pot status from PotDetailsPage:", updateError);
        }
    };

    // Handler for saving inline edits
    const handleSavePotUpdate = async (field, value) => {
        if (!potDetails) return;
        setLocalUiError(null);

        // Basic validation
        if (field === 'hand' && (isNaN(parseFloat(value)) || parseFloat(value) <= 0)) {
            setLocalUiError("Amount per hand must be a positive number.");
            return;
        }
        if (field === 'startDate' && !value) {
            setLocalUiError("Start date cannot be empty.");
            return;
        }

        const potUpdateData = { [field]: value };

        try {
            await dispatch(potsActions.updateAPot(potUpdateData, numPotId));
            // Exit edit mode on success. Redux state will update the component.
            if (field === 'hand') setIsEditingAmount(false);
            if (field === 'startDate') setIsEditingStartDate(false);
        } catch (updateError) {
            // The thunk already sets the redux error state, but I can display it locally.
            setLocalUiError(updateError.message || `Failed to update ${field}.`);
        }
    };

    const handleAddUser = async (userId) => {
        if (!potDetails || !userId) return;
        const userData = { userId, potId: numPotId };
        setLocalUiError(null);
        try {
            await dispatch(potsActions.addUserToPot(userData));
        } catch (error) {
            console.error("Failed to add user to pot:", error);
            setLocalUiError(error.message || "Failed to add user.");
        }
    };
    const handleRemoveUserFromPot = async (userId) => {
        if (!potDetails || !userId) return;
        const userData = { userId, potId: numPotId };
        if (window.confirm("Are you sure you want to remove this user from the pot? This action cannot be undone.")) {
            setLocalUiError(null);
            try {
                await dispatch(potsActions.removeUserFromPot(userData));
            } catch (error) {
                console.error("Failed to delete user from pot:", error.message);
                setLocalUiError(error.message || "Failed to remove user.");
            }
        }
    };

    // Callback for react-dnd to update local state during drag (optimistic update)
    const moveRow = useCallback((dragIndex, hoverIndex) => {
        setOrderedUsers((prevUsers) => {
            const newUsers = [...prevUsers];
            const [draggedItem] = newUsers.splice(dragIndex, 1);
            newUsers.splice(hoverIndex, 0, draggedItem);
            return newUsers;
        });
    }, []); // setOrderedUsers is stable

    // Function to submit the reordered list to the backend
    const handleReorderUsersSubmit = async () => {
        if (!currUser || currUser.role !== 'banker' || (potDetails?.status !== 'Not Started' && potDetails?.status !== 'Paused')) {
            alert("Only bankers can reorder users, and only if the pot has not started or is paused.");
            // Revert optimistic update if not authorized, using the Redux state as source of truth
            if (potDetails?.Users) {
                setOrderedUsers([...potDetails.Users].sort((a, b) => (a.potMemberDetails?.displayOrder || 0) - (b.potMemberDetails?.displayOrder || 0)));
            }
            return;
        }
        const orderedUserIds = orderedUsers.map(user => user.id);
        setLocalUiError(null);
        dispatch(potsActions.clearPotReorderError());

        try {
            await dispatch(potsActions.reorderPotUsers(numPotId, orderedUserIds));
            // On success, Redux state (potDetails) will update via getAPotById in thunk,
            // which in turn triggers the useEffect to sync local orderedUsers.
        } catch (err) {
            // This catch block will catch errors re-thrown by the thunk.
            // The Redux state 'reorderError' should also be set by the thunk's failure action.
            // Revert local optimistic update to match the (failed) backend state.
            if (potDetails?.Users) {
                setOrderedUsers([...potDetails.Users].sort((a, b) => (a.potMemberDetails?.displayOrder || 0) - (b.potMemberDetails?.displayOrder || 0)));
            }
        }
    };

    if (isLoading && !potDetails) { return <LoadingSpinner message="Loading Pot Details..." />; }
    if (error && (!potDetails || Object.keys(potDetails).length === 0)) {
        return (
            <div className="pot-details-page-wrapper">
                <h1 className="pot-header">Error Loading Pot!</h1>
                <div className="error">
                    <p> {error.message || "An unexpected error occurred!"} {error.status && `(Status: ${error.status})`}</p>
                    <p>Redirecting to All Pots Page...</p>
                </div>
            </div>
        );
    }
    if (!potDetails && !isLoading) {
        return (
            <div className="pot-details-page-wrapper">
                <h1 className="pot-header">Pot Not Found</h1>
                <p>This pot may not exist or you may not have permission to view it.</p>
                <button onClick={() => navigate('/pots')}>Back to Pots</button>
            </div>
        );
    }
    if (!potDetails) return null;

    const hidePotDeleteButtonClassName = (potDetails.status !== 'Not Started') ? 'hidden' : '';
    const availableStatuses = ['Active', 'Not Started', 'Ended', 'Paused', 'Closed'];
    // let paymentSummaryCounter = 0;
    const availableUsersForModalList = Object.values(allUsersForModal || {});
    const canBankerEditOrder = currUser?.role === 'banker' && (potDetails.status === 'Not Started' || potDetails.status === 'Paused') && orderedUsers.length > 1;
    // Condition for banker to edit pot details like amount and start date
    const canBankerEditDetails = currUser?.role === 'banker' && (potDetails.status === 'Not Started' || potDetails.status === 'Paused');


    return (
        <div className="pot-details-page-wrapper">
            <h1 className="pot-header">POT DETAILS</h1>
            <div className="buttons-bar">
                <div className="action-buttons-container">
                    {currUser?.role === 'banker' && <OpenModalButton
                        buttonText="Change Status"
                        modalComponent={<StatusUpdateModal
                            currentStatus={potDetails.status}
                            onSave={handleChangeStatus}
                            availableStatuses={availableStatuses}
                            isSavingStatus={isUpdatingPot || isReordering}
                        />}
                    />}
                    {currUser?.role === 'banker' && <button className={`${hidePotDeleteButtonClassName} finger-button-pointer`}
                        onClick={() => handleDeletePot(numPotId)}
                        disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete Pot'}
                    </button>}
                </div>
            </div>

            {weekError && <div className="error"><p>Weekly Data Error: {weekError.message || String(weekError)}</p></div>}
            {reorderError && <div className="error"><p>Reorder Error: {reorderError.message || String(reorderError)}</p></div>}
            {localUiError && <div className="error"><p>{localUiError}</p></div>}

            <div className="pot-container">
                <div className="pot-name-div">
                    <h2 className="pot-name">{potDetails.name?.toUpperCase()}</h2>
                </div>
                <div className='week-display-div'>
                    <span>Current Week:</span> <span>{currentWeek} / {totalWeeks > 0 ? totalWeeks : 'N/A'}</span>
                </div>
                <div className='banker-div'>
                    <span>Banker:</span> <span>{potDetails.ownerName}</span>
                </div>
               
                <div className="pot-dates-div">
                    <span>Start Date:</span>
                    {isEditingStartDate && canBankerEditDetails ? (
                        <div className="inline-edit-container">
                            <input
                                type="date"
                                value={editableStartDate}
                                onChange={(e) => setEditableStartDate(e.target.value)}
                                disabled={isUpdatingPot}
                            />
                            <FaSave className="save-icon" onClick={() => handleSavePotUpdate('startDate', editableStartDate)} />
                            <FaTimesCircle className="cancel-icon" onClick={() => setIsEditingStartDate(false)} />
                        </div>
                    ) : (
                        <div className="inline-display-container">
                            <span>{formatDate(potDetails.startDate)}</span>
                            {canBankerEditDetails && !isUpdatingPot && (
                                <FaEdit className="edit-icon" onClick={() => setIsEditingStartDate(true)} />
                            )}
                        </div>
                    )}
                </div>
                <div className="pot-dates-div">
                    <span>End Date:</span> <span>{formatDate(potDetails.endDate)}</span>
                </div>
               
                <div className="pot-amount-div">
                    <span>Amt/Hand:</span>
                    {isEditingAmount && canBankerEditDetails ? (
                        <div className="inline-edit-container">
                            <input
                                type="number"
                                value={editableAmount}
                                onChange={(e) => setEditableAmount(e.target.value)}
                                disabled={isUpdatingPot}
                                step="10"
                                min="0"
                            />
                            <FaSave className="save-icon" onClick={() => handleSavePotUpdate('hand', editableAmount)} />
                            <FaTimesCircle className="cancel-icon" onClick={() => setIsEditingAmount(false)} />
                        </div>
                    ) : (
                        <div className="inline-display-container">
                            <span>{`$${Number.parseFloat(potDetails.hand || 0).toFixed(2)}`}</span>
                            {canBankerEditDetails && !isUpdatingPot && (
                                <FaEdit className="edit-icon" onClick={() => setIsEditingAmount(true)} />
                            )}
                        </div>
                    )}
                </div>
                <div className="pot-amount-div">
                    <span>Pot Amount:</span> <span>{`$${Number.parseFloat(potDetails.amount || 0).toFixed(2)}`}</span>
                </div>
                <div className="status-div">
                    <span>Status:</span> <span>{potDetails.status}</span>
                </div>
            </div>

            <div className="members-div">
                <div className="members">
                    <span><h3>MEMBERS</h3></span>
                    <div>
                        <span>Total Members: {orderedUsers.length}</span>
                        <span className="add-users-button">
                            {currUser?.role === 'banker' && (potDetails.status === 'Not Started' || potDetails.status === 'Paused') && (
                                <OpenModalButton
                                    buttonText="Add Users"
                                    modalComponent={<AddUsersToPot
                                        currentPotUsers={orderedUsers}
                                        availableUsers={availableUsersForModalList}
                                        onSave={handleAddUser}
                                        isSavingUsers={isUpdatingPot}
                                    />}
                                />
                            )}
                        </span>
                    </div>
                    {/* ... payment summary ... */}
                </div>

                {totalWeeks > 0 && (
                    <select value={currentWeek} onChange={e => setCurrentWeek(parseInt(e.target.value))} disabled={isLoadingWeek}>
                        {weeksForSelect.map((weekNum, index) => (
                            <option key={weekNum} value={weekNum}>
                                Week {weekNum} (Draw: {orderedUsers[index]?.firstName || 'N/A'})
                            </option>
                        ))}
                    </select>
                )}

                {(isLoadingWeek || (isReordering && !isLoading)) && totalWeeks > 0 && <LoadingSpinner message={isReordering ? "Saving order..." : "Loading weekly status..."} />}

                {!isLoadingWeek && !isReordering && totalWeeks > 0 && (
                    <div className="members-table-container">
                        {canBankerEditOrder && (
                            <div className="reorder-hint">
                                <FaBars /> Drag rows to reorder draw sequence.
                            </div>
                        )}
                        <table className={`members-table ${isReordering ? 'reordering-active' : ''}`}>
                            <thead>
                                <tr>
                                    {
                                        canBankerEditOrder ? <th className="drag-handle-header"></th> :
                                            <th></th>
                                    }
                                    <th>#</th>
                                    <th>Name</th>
                                    <th>Draw Date</th>
                                    <th>Paid Hand (Wk {currentWeek})</th>
                                    <th>Got Draw (Wk {currentWeek})</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderedUsers.map((user, index) => (
                                    <DraggableUserRow
                                        key={user.id.toString()} // Key must be string
                                        index={index}
                                        user={user}
                                        moveRow={moveRow}
                                        onDragBegin={() => setIsUserActuallyDragging(true)}
                                        onDragOperationEnd={(didDrop) => {
                                            setIsUserActuallyDragging(false);
                                            if (didDrop) {
                                                handleReorderUsersSubmit(); // Submit the current `orderedUsers`
                                            } else {
                                                // If drop was cancelled or invalid, revert to Redux state
                                                if (potDetails?.Users) {
                                                    setOrderedUsers([...potDetails.Users].sort((a, b) => (a.potMemberDetails?.displayOrder || 0) - (b.potMemberDetails?.displayOrder || 0)));
                                                }
                                            }
                                        }}
                                        canBankerEditOrder={canBankerEditOrder}
                                        currentWeek={currentWeek}
                                        weeklyStatusMap={weeklyStatusMap}
                                        handlePaymentChange={handlePaymentChange}
                                        handleRemoveUserFromPot={handleRemoveUserFromPot}
                                        currUser={currUser}
                                        potDetailsStatus={potDetails.status}
                                        formatDate={formatDate}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {totalWeeks === 0 && !isLoadingWeek && <p>No members added to this pot yet. Add members to start!</p>}
            </div>
        </div>
    );
};

export default PotDetailsPage;