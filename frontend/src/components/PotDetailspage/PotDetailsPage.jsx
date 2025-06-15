import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
    FaBars, FaEdit, FaSave, FaTimesCircle, FaPlay, FaPause, FaClone,
    FaCheckCircle, FaTrashAlt
} from 'react-icons/fa';
import * as potsActions from '../../store/pots';
import * as usersActions from '../../store/users';
import { fetchWeeklyStatus, updateWeeklyPayment } from '../../store/transactions';
import { useNavigate, useParams } from "react-router-dom";
import OpenModalButton from "../OpenModalButton";
import AddUsersToPot from "../AddUserToPot";
import LoadingSpinner from "../LoadingSpinner";
import DraggableUserRow from '../DraggableUserRow';
import DeleteConfirmationModal from '../DeleteConfirmationModal'; // Import the modal
import './PotDetailsPage.css';

const STABLE_EMPTY_OPJECT = Object.freeze({});

// Helper to determine the lifecycle stage
const getPotLifecycle = (status) => {
    if (status === 'Not Started' || status === 'Paused') {
        return 'pre-active';
    }
    if (status === 'Active') {
        return 'active';
    }
    if (['Ended', 'Closed', 'Cancelled'].includes(status)) {
        return 'terminal';
    }
    return 'unknown';
};

const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return 'Invalid Date';
        const utcDate = new Date(Date.UTC(year, month, day));
        if (isNaN(utcDate.getTime())) return 'Invalid Date';
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' };
        return utcDate.toLocaleDateString('en-US', options);
    }
    return 'Invalid Format';
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
    const isUpdatingPot = useSelector(state => state.pots.isUpdating);
    const isReordering = useSelector(state => state.pots.isReorderingPotUsers);
    const reorderError = useSelector(state => state.pots.errorReorderingPotUsers);
    const allUsersForModal = useSelector(state => state.users.allUsers);

    const [currentWeek, setCurrentWeek] = useState(1);
    const [orderedUsers, setOrderedUsers] = useState([]);
    const [localUiError, setLocalUiError] = useState(null);
    const [isUserActuallyDragging, setIsUserActuallyDragging] = useState(false);

    const [isEditingAmount, setIsEditingAmount] = useState(false);
    const [editableAmount, setEditableAmount] = useState('');
    const [isEditingStartDate, setIsEditingStartDate] = useState(false);
    const [editableStartDate, setEditableStartDate] = useState('');

    useEffect(() => {
        if (!isUserActuallyDragging && !isReordering) {
            if (potDetails?.Users) {
                const sortedUsersFromProps = [...potDetails.Users].sort((a, b) => (a.potMemberDetails?.displayOrder || Infinity) - (b.potMemberDetails?.displayOrder || Infinity));
                if (JSON.stringify(sortedUsersFromProps) !== JSON.stringify(orderedUsers)) {
                    setOrderedUsers(sortedUsersFromProps);
                }
            } else { setOrderedUsers([]); }
        }
    }, [potDetails?.Users, isReordering, isUserActuallyDragging, orderedUsers]);

    useEffect(() => {
        if (potDetails) {
            setEditableAmount(potDetails.hand || '');
            setEditableStartDate(potDetails.startDate || '');
        }
    }, [potDetails]);

    // Automatically set pot to 'Ended' if the date passes
    useEffect(() => {
        if (potDetails && potDetails.status === 'Active' && potDetails.endDate) {
            const today = new Date();
            const endDate = new Date(potDetails.endDate);
            today.setHours(0,0,0,0);
            endDate.setUTCHours(0,0,0,0);

            if (today > endDate) {
                dispatch(potsActions.updateAPot({ status: 'Ended' }, numPotId));
            }
        }
    }, [potDetails, dispatch, numPotId]);

    const totalWeeks = orderedUsers.length || 0;
    const weeksForSelect = useMemo(() => Array.from({ length: totalWeeks }, (_, i) => i + 1), [totalWeeks]);
    const weeklyStatusMap = useSelector(state => state.transactions.weeklyStatusByPot[numPotId]?.[currentWeek] || STABLE_EMPTY_OPJECT);
    const weekLoadingKey = `${numPotId}_${currentWeek}`;
    const isLoadingWeek = useSelector(state => !!state.transactions.loadingWeeklyStatus[weekLoadingKey]);
    const weekError = useSelector(state => state.transactions.errorWeeklyStatus[weekLoadingKey]);

    const paymentSummary = useMemo(() => {
        if (!potDetails || !weeklyStatusMap) {
            return { membersPaidThisWeek: 0, amountRemaining: potDetails?.amount || 0 };
        }
        const membersPaidThisWeek = Object.values(weeklyStatusMap).filter(status => status.paidHand).length;
        const totalPotValue = parseFloat(potDetails.amount || 0);
        const handValue = parseFloat(potDetails.hand || 0);
        const amountPaid = membersPaidThisWeek * handValue;
        const amountRemaining = totalPotValue - amountPaid;
        return { membersPaidThisWeek, amountRemaining: Math.max(0, amountRemaining) };
    }, [weeklyStatusMap, potDetails]);

    useEffect(() => { dispatch(usersActions.getAllUsers()); }, [dispatch]);

    useEffect(() => {
        if (numPotId) { dispatch(potsActions.getAPotById(numPotId)); }
        return () => {
            dispatch(potsActions.clearPotReorderError());
            dispatch(potsActions.clearPotDetailsError());
        };
    }, [dispatch, numPotId]);

    useEffect(() => {
        if (numPotId && !isLoading && potDetails && totalWeeks > 0) {
            if (currentWeek > totalWeeks && totalWeeks > 0) setCurrentWeek(totalWeeks);
            else if (currentWeek < 1 && totalWeeks > 0) setCurrentWeek(1);
            else if (currentWeek >= 1 && currentWeek <= totalWeeks) dispatch(fetchWeeklyStatus(numPotId, currentWeek));
        } else if (totalWeeks === 0 && currentWeek !== 1) setCurrentWeek(1);
    }, [dispatch, numPotId, currentWeek, isLoading, potDetails, totalWeeks]);

    const handleChangeStatus = async (newStatus) => {
        if (!potDetails || !newStatus) return;
        const potUpdateData = { status: newStatus };
        try {
            await dispatch(potsActions.updateAPot(potUpdateData, numPotId));
        } catch (updateError) {
            console.error("Failed to update pot status:", updateError);
        }
    };
    
    const handleDuplicatePot = () => {
        if (!potDetails) return;
        const duplicationState = {
            name: `Copy of ${potDetails.name}`,
            hand: 0,
            amount: 0,
            userIds: potDetails.Users.map(u => u.id),
        };
        navigate('/pots/create', { state: { duplicateData: duplicationState } });
    };

    const handlePaymentChange = (userId, week, paymentType, isPaid) => {
        dispatch(updateWeeklyPayment({ potId: numPotId, userId, week, paymentType, isPaid }));
    };

    // Removed window.confirm from handler. Confirmation is now in the modal.
    const handleDeletePot = async (potIdToDelete) => {
        await dispatch(potsActions.deletePot(potIdToDelete));
        navigate('/pots');
    };

    const handleSavePotUpdate = async (field, value) => {
        setLocalUiError(null);
        if ((field === 'hand' && (isNaN(parseFloat(value)) || parseFloat(value) <= 0)) || (field === 'startDate' && !value)) {
            setLocalUiError(field === 'hand' ? "Amount must be a positive number." : "Start date cannot be empty.");
            return;
        }
        try {
            await dispatch(potsActions.updateAPot({ [field]: value }, numPotId));
            if (field === 'hand') setIsEditingAmount(false);
            if (field === 'startDate') setIsEditingStartDate(false);
        } catch (updateError) {
            setLocalUiError(updateError.message || `Failed to update ${field}.`);
        }
    };
    const handleAddUser = async (userId) => {
        setLocalUiError(null);
        try {
            await dispatch(potsActions.addUserToPot({ userId, potId: numPotId }));
        } catch (error) {
            setLocalUiError(error.message || "Failed to add user.");
        }
    };
    const handleRemoveUserFromPot = async (userId) => {
        setLocalUiError(null);
        try {
            await dispatch(potsActions.removeUserFromPot({ userId, potId: numPotId }));
        } catch (error) {
            setLocalUiError(error.message || "Failed to remove user.");
        }
    };
    const moveRow = useCallback((dragIndex, hoverIndex) => {
        setOrderedUsers(prevUsers => {
            const newUsers = [...prevUsers];
            const [draggedItem] = newUsers.splice(dragIndex, 1);
            newUsers.splice(hoverIndex, 0, draggedItem);
            return newUsers;
        });
    }, []);
    const handleReorderUsersSubmit = async () => {
        if (!currUser || currUser.role !== 'banker' || (potDetails?.status !== 'Not Started' && potDetails?.status !== 'Paused')) {
            // Using a modal instead of alert here as well could be a future improvement.
            alert("Only bankers can reorder users, and only if the pot has not started or is paused.");
            if (potDetails?.Users) { setOrderedUsers([...potDetails.Users].sort((a, b) => (a.potMemberDetails?.displayOrder || 0) - (b.potMemberDetails?.displayOrder || 0))); }
            return;
        }
        const orderedUserIds = orderedUsers.map(user => user.id);
        dispatch(potsActions.clearPotReorderError());
        try {
            await dispatch(potsActions.reorderPotUsers(numPotId, orderedUserIds));
        } catch (err) {
            if (potDetails?.Users) { setOrderedUsers([...potDetails.Users].sort((a, b) => (a.potMemberDetails?.displayOrder || 0) - (b.potMemberDetails?.displayOrder || 0))); }
        }
    };

    if (isLoading && !potDetails) { return <LoadingSpinner message="Loading Pot Details..." />; }
    if (error && (!potDetails || Object.keys(potDetails).length === 0)) {
        return <div className="pot-details-page-wrapper"><h1 className="pot-header">Error Loading Pot!</h1><div className="error"><p>{error.message || "An error occurred"}</p></div></div>;
    }
    if (!potDetails && !isLoading) {
        return <div className="pot-details-page-wrapper"><h1 className="pot-header">Pot Not Found</h1></div>;
    }
    if (!potDetails) return null;

    const potLifecycle = getPotLifecycle(potDetails.status);
    const availableUsersForModalList = Object.values(allUsersForModal || {});
    const canBankerEditOrder = currUser?.role === 'banker' && potLifecycle === 'pre-active' && orderedUsers.length > 1;
    const canBankerEditDetails = currUser?.role === 'banker' && potLifecycle === 'pre-active';

    return (
        <div className="pot-details-page-wrapper">
            <h1 className="pot-header">POT DETAILS</h1>
            <div className="buttons-bar">
                <div className="action-buttons-container">
                    {currUser?.role === 'banker' && potDetails.status === 'Not Started' && (
                        <button className="start-resume-button" onClick={() => handleChangeStatus('Active')} disabled={isUpdatingPot || !orderedUsers.length} title="Start Pot">
                            <FaPlay/>
                        </button>
                    )}
                     {currUser?.role === 'banker' && potDetails.status === 'Paused' && (
                        <button className="start-resume-button" onClick={() => handleChangeStatus('Active')} disabled={isUpdatingPot} title="Resume Pot">
                            <FaPlay/>
                        </button>
                    )}
                     {currUser?.role === 'banker' && potDetails.status === 'Active' && (
                        <button className="pause-button" onClick={() => handleChangeStatus('Paused')} disabled={isUpdatingPot} title="Pause Pot">
                            <FaPause/>
                        </button>
                    )}
                     {currUser?.role === 'banker' && potLifecycle !== 'terminal' && (
                        <div className="cancel-button-wrapper"> {/* WRAPPER ADDED */}
                            <OpenModalButton
                                buttonText={<FaTimesCircle/>}
                                title="Cancel Pot"
                                modalComponent={
                                    <DeleteConfirmationModal
                                        message="Are you sure you want to cancel this pot?"
                                        onConfirm={() => handleChangeStatus('Cancelled')}
                                        confirmButtonText="Yes, Cancel Pot"
                                    />
                                }
                            />
                        </div>
                    )}
                     {currUser?.role === 'banker' && potDetails.status === 'Ended' && (
                         <div className="close-button-wrapper"> {/* WRAPPER ADDED */}
                            <OpenModalButton
                                buttonText={<FaCheckCircle />}
                                title="Close Pot"
                                modalComponent={
                                    <DeleteConfirmationModal
                                        message="Are you sure you want to close this pot? This is the final step and cannot be undone."
                                        onConfirm={() => handleChangeStatus('Closed')}
                                        confirmButtonText="Yes, Close Pot"
                                    />
                                }
                            />
                        </div>
                    )}
                     {currUser?.role === 'banker' && potLifecycle === 'terminal' && (
                        <button className="duplicate-button" onClick={handleDuplicatePot} disabled={isUpdatingPot} title="Duplicate Pot">
                            <FaClone/>
                        </button>
                    )}
                    {currUser?.role === 'banker' && potDetails.status === 'Not Started' && (
                         <div className="delete-button-wrapper"> {/* WRAPPER ADDED */}
                            <OpenModalButton
                                buttonText={<FaTrashAlt/>}
                                title="Delete Pot"
                                modalComponent={
                                    <DeleteConfirmationModal
                                        message="Are you sure you want to delete this pot? This action cannot be undone."
                                        onConfirm={() => handleDeletePot(numPotId)}
                                        confirmButtonText="Yes, Delete Pot"
                                    />
                                }
                            />
                        </div>
                    )}
                </div>
            </div>

            {weekError && <div className="error"><p>Weekly Data Error: {weekError.message || String(weekError)}</p></div>}
            {reorderError && <div className="error"><p>Reorder Error: {reorderError.message || String(reorderError)}</p></div>}
            {localUiError && <div className="error"><p>{localUiError}</p></div>}

            <div className="pot-container">
                <div className="pot-name-div"><h2 className="pot-name">{potDetails.name?.toUpperCase()}</h2></div>
                <div className='week-display-div'><span>Current Week:</span> <span>{currentWeek} / {totalWeeks > 0 ? totalWeeks : 'N/A'}</span></div>
                <div className='banker-div'><span>Banker:</span> <span>{potDetails.ownerName}</span></div>
                <div className="pot-dates-div">
                    <span>Start Date:</span>
                    {isEditingStartDate && canBankerEditDetails ? (
                        <div className="inline-edit-container"><input type="date" value={editableStartDate} onChange={(e) => setEditableStartDate(e.target.value)} disabled={isUpdatingPot} /><FaSave className="save-icon" onClick={() => handleSavePotUpdate('startDate', editableStartDate)} /><FaTimesCircle className="cancel-icon" onClick={() => setIsEditingStartDate(false)} /></div>
                    ) : (
                        <div className="inline-display-container"><span>{formatDate(potDetails.startDate)}</span>{canBankerEditDetails && !isUpdatingPot && (<FaEdit className="edit-icon" onClick={() => setIsEditingStartDate(true)} />)}</div>
                    )}
                </div>
                <div className="pot-dates-div"><span>End Date:</span> <span>{formatDate(potDetails.endDate)}</span></div>
                <div className="pot-amount-div">
                    <span>Amt/Hand:</span>
                    {isEditingAmount && canBankerEditDetails ? (
                        <div className="inline-edit-container"><input type="number" value={editableAmount} onChange={(e) => setEditableAmount(e.target.value)} disabled={isUpdatingPot} step="10" min="0" /><FaSave className="save-icon" onClick={() => handleSavePotUpdate('hand', editableAmount)} /><FaTimesCircle className="cancel-icon" onClick={() => setIsEditingAmount(false)} /></div>
                    ) : (
                        <div className="inline-display-container"><span className="amount-display">{`$${Number.parseFloat(potDetails.hand || 0).toFixed(2)}`}</span>{canBankerEditDetails && !isUpdatingPot && (<FaEdit className="edit-icon" onClick={() => setIsEditingAmount(true)} />)}</div>
                    )}
                </div>
                <div className="pot-amount-div"><span>Pot Amount:</span> <span>{`$${Number.parseFloat(potDetails.amount || 0).toFixed(2)}`}</span></div>
                <div className="status-div"><span>Status:</span> <span>{potDetails.status}</span></div>
            </div>

            <div className="members-div">
                <div className="members-header">
                    <h3>MEMBERS</h3>
                    {currUser?.role === 'banker' && potLifecycle === 'pre-active' && (
                        <OpenModalButton buttonText="Add Users" modalComponent={<AddUsersToPot currentPotUsers={orderedUsers} availableUsers={availableUsersForModalList} onSave={handleAddUser} isSavingUsers={isUpdatingPot}/>}/>
                    )}
                </div>
                <div className="members-summary">
                    <span>Total: <strong>{orderedUsers.length}</strong></span>
                    <span>Paid: <strong>{paymentSummary.membersPaidThisWeek}</strong></span>
                    <span>Remaining: <strong>${paymentSummary.amountRemaining.toFixed(2)}</strong></span>
                </div>
                {totalWeeks > 0 && (
                    <select value={currentWeek} onChange={e => setCurrentWeek(parseInt(e.target.value))} disabled={isLoadingWeek}>
                        {weeksForSelect.map((weekNum, index) => (<option key={weekNum} value={weekNum}>Week {weekNum} (Draw: {orderedUsers[index]?.firstName || 'N/A'})</option>))}
                    </select>
                )}
                {(isLoadingWeek || (isReordering && !isLoading)) && totalWeeks > 0 && <LoadingSpinner message={isReordering ? "Saving order..." : "Loading weekly status..."} />}
                {!isLoadingWeek && !isReordering && totalWeeks > 0 && (
                    <div className="members-table-container">
                        {canBankerEditOrder && (<div className="reorder-hint"><FaBars /> Drag rows to reorder draw sequence.</div>)}
                        <table className={`members-table ${isReordering ? 'reordering-active' : ''}`}>
                            <thead>
                                <tr>
                                    {canBankerEditOrder ? <th className="drag-handle-header"></th> : <th></th>}
                                    <th>#</th><th>Name</th><th>Draw Date</th><th>Paid (Wk {currentWeek})</th><th>Draw (Wk {currentWeek})</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderedUsers.map((user, index) => (
                                    <DraggableUserRow key={user.id.toString()} index={index} user={user} moveRow={moveRow}
                                        onDragBegin={() => setIsUserActuallyDragging(true)}
                                        onDragOperationEnd={(didDrop) => {
                                            setIsUserActuallyDragging(false);
                                            if (didDrop) { handleReorderUsersSubmit(); } 
                                            else { if (potDetails?.Users) { setOrderedUsers([...potDetails.Users].sort((a, b) => (a.potMemberDetails?.displayOrder || 0) - (b.potMemberDetails?.displayOrder || 0))); } }
                                        }}
                                        canBankerEditOrder={canBankerEditOrder} currentWeek={currentWeek} weeklyStatusMap={weeklyStatusMap}
                                        handlePaymentChange={handlePaymentChange} handleRemoveUserFromPot={handleRemoveUserFromPot}
                                        currUser={currUser} potDetailsStatus={potDetails.status} formatDate={formatDate}
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
