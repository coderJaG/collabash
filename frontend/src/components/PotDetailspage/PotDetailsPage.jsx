// PotDetailsPage.jsx - Updated with shared CSS classes

import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
    FaBars, FaEdit, FaSave, FaTimesCircle, FaPlay, FaPause, FaClone,
    FaCheckCircle, FaTrashAlt
} from 'react-icons/fa';
import { MdArrowBack } from 'react-icons/md';
import * as potsActions from '../../store/pots';
import * as usersActions from '../../store/users';
import { fetchWeeklyStatus, updateWeeklyPayment } from '../../store/transactions';
import { formatDate } from "../../utils/formatDate";
import OpenModalButton from "../OpenModalButton";
import AddUsersToPot from "../AddUserToPot";
import LoadingSpinner from "../LoadingSpinner";
import DraggableUserRow from '../DraggableUserRow';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import './PotDetailsPage.css';

const STABLE_EMPTY_OPJECT = Object.freeze({});

const getPotLifecycle = (status) => {
    if (status === 'Not Started' || status === 'Paused') return 'pre-active';
    if (status === 'Active') return 'active';
    if (['Ended', 'Closed', 'Cancelled'].includes(status)) return 'terminal';
    return 'unknown';
};

const PotDetailsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
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

    // Add these selectors for user addition status
    const addUserStatus = useSelector(state => state.pots.addUserStatus);
    const isAddingUsers = useSelector(state => state.pots.isUpdating);

    const [currentWeek, setCurrentWeek] = useState(1);
    const [orderedUsers, setOrderedUsers] = useState([]);
    const [localUiError, setLocalUiError] = useState(null);
    const [isUserActuallyDragging, setIsUserActuallyDragging] = useState(false);

    // Add flash message state
    const [flashMessage, setFlashMessage] = useState(null);

    const [isEditingAmount, setIsEditingAmount] = useState(false);
    const [editableAmount, setEditableAmount] = useState('');
    const [isEditingStartDate, setIsEditingStartDate] = useState(false);
    const [editableStartDate, setEditableStartDate] = useState('');
    const [isEditingFrequency, setIsEditingFrequency] = useState(false);
    const [editableFrequency, setEditableFrequency] = useState('');
    const [isEditingFee, setIsEditingFee] = useState(false);

    const userPermissions = useMemo(() => new Set(currUser?.permissions || []), [currUser]);
    const canEditPot = userPermissions.has('pot:edit');
    const canDeletePot = userPermissions.has('pot:delete');
    const canManageMembers = userPermissions.has('pot:manage_members');
    const canDuplicatePot = userPermissions.has('pot:create');

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
            if (!isEditingAmount) {
                setEditableAmount(potDetails.hand || '');
            }
            if (!isEditingStartDate) {
                setEditableStartDate(potDetails.startDate || '');
            }
            if (!isEditingFrequency) {
                setEditableFrequency(potDetails.frequency || 'weekly');
            }
            if (!isEditingFee) {
                setIsEditingFee(potDetails.subscriptionFee || '1.00');
            }
        }
    }, [potDetails, isEditingAmount, isEditingStartDate, isEditingFrequency, isEditingFee]);

    useEffect(() => {
        if (potDetails && potDetails.status === 'Active' && potDetails.endDate) {
            const today = new Date();
            const endDate = new Date(potDetails.endDate);
            today.setHours(0, 0, 0, 0);
            endDate.setUTCHours(0, 0, 0, 0);
            if (today > endDate) {
                dispatch(potsActions.updateAPot({ status: 'Ended' }, numPotId));
            }
        }
    }, [potDetails, dispatch, numPotId]);

    // Flash message auto-clear effect
    useEffect(() => {
        if (flashMessage) {
            const timer = setTimeout(() => {
                setFlashMessage(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [flashMessage]);

    // Handle add user status updates
    useEffect(() => {
        if (addUserStatus?.timestamp) {
            if (addUserStatus.success) {
                const { summary, userIds } = addUserStatus;

                if (summary) {
                    const { added, skipped, notFound, totalRequested } = summary;
                    let message = '';
                    let type = 'success';

                    if (added > 0) {
                        message += `Successfully added ${added} user${added !== 1 ? 's' : ''} to the pot.`;
                    }

                    if (skipped > 0) {
                        message += ` ${skipped} user${skipped !== 1 ? 's were' : ' was'} already in the pot.`;
                    }

                    if (notFound > 0) {
                        message += ` ${notFound} user${notFound !== 1 ? 's were' : ' was'} not found.`;
                        if (added === 0) type = 'warning';
                    }

                    if (added === 0) {
                        type = totalRequested === skipped ? 'info' : 'error';
                        if (totalRequested === skipped) {
                            message = `All ${skipped} selected users were already in the pot.`;
                        } else {
                            message = 'No users were added to the pot.';
                        }
                    }

                    setFlashMessage({ type, message });
                } else {
                    // Fallback message for single user or when summary not available
                    const userCount = Array.isArray(userIds) ? userIds.length : 1;
                    setFlashMessage({
                        type: 'success',
                        message: `Successfully added ${userCount} user${userCount !== 1 ? 's' : ''} to the pot.`
                    });
                }
            } else {
                // Handle failure
                setFlashMessage({
                    type: 'error',
                    message: addUserStatus.message || 'Failed to add users to the pot.'
                });
            }
        }
    }, [addUserStatus]);

    // Simplified drag handling - no scroll prevention on mobile
    const handleDragStart = () => {
        setIsUserActuallyDragging(true);
    };

    const handleDragEnd = (didDrop) => {
        setIsUserActuallyDragging(false);

        if (didDrop) {
            handleReorderUsersSubmit();
        } else {
            if (potDetails?.Users) {
                setOrderedUsers([...potDetails.Users].sort((a, b) => (a.potMemberDetails?.displayOrder || 0) - (b.potMemberDetails?.displayOrder || 0)));
            }
        }
    };

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

    useEffect(() => {
        dispatch(usersActions.getAllUsers());
        if (numPotId) {
            dispatch(potsActions.getAPotById(numPotId));
        }
        return () => {
            dispatch(potsActions.clearPotReorderError());
            dispatch(potsActions.clearPotDetailsError());
        };
    }, [dispatch, numPotId]);

    useEffect(() => {
        if (numPotId && !isLoading && potDetails && totalWeeks > 0) {
            if (currentWeek > totalWeeks) setCurrentWeek(totalWeeks);
            else if (currentWeek < 1 && totalWeeks > 0) setCurrentWeek(1);
            else if (currentWeek >= 1 && currentWeek <= totalWeeks) dispatch(fetchWeeklyStatus(numPotId, currentWeek));
        } else if (totalWeeks === 0 && currentWeek !== 1) {
            setCurrentWeek(1);
        }
    }, [dispatch, numPotId, currentWeek, isLoading, potDetails, totalWeeks]);

    const handleChangeStatus = async (newStatus) => {
        await dispatch(potsActions.updateAPot({ status: newStatus }, numPotId));
    };

    const handleDuplicatePot = () => {
        if (!potDetails) return;
        const duplicationState = {
            name: `Copy of ${potDetails.name}`,
            hand: 0,
            amount: 0,
            frequency: potDetails.frequency,
            userIds: potDetails.Users.map(u => u.id),
        };
        navigate('/pots/create', { state: { duplicateData: duplicationState } });
    };

    const handleSavePotUpdate = async (field, value) => {
        setLocalUiError(null);
        try {
            await dispatch(potsActions.updateAPot({ [field]: value }, numPotId));
            if (field === 'hand') setIsEditingAmount(false);
            if (field === 'startDate') setIsEditingStartDate(false);
            if (field === 'frequency') setIsEditingFrequency(false);
            if (field === 'subscriptionFee') setIsEditingFee(false);
        } catch (updateError) {
            setLocalUiError(updateError.message || `Failed to update ${field}.`);
        }
    };

    // NEW: Updated handler for bulk user addition
    const handleAddUsersToModal = async (selectedUserIds) => {
        if (!selectedUserIds || selectedUserIds.length === 0) {
            throw new Error('No users selected');
        }

        setLocalUiError(null);

        try {
            // Use the new bulk function
            const result = await dispatch(potsActions.addUsersToPot(numPotId, selectedUserIds));

            // The flash message will be handled by the useEffect watching addUserStatus
            return result;

        } catch (error) {
            console.error('Error in bulk user addition:', error);

            let errorMessage = 'Failed to add users. Please try again.';

            if (error.status === 400) {
                errorMessage = 'Invalid request. Please check your selection and try again.';
            } else if (error.status === 403) {
                errorMessage = 'You do not have permission to add users to this pot.';
            } else if (error.status === 404) {
                errorMessage = 'The pot was not found. Please refresh and try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setLocalUiError(errorMessage);
            throw error;
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
        if (!canManageMembers || (potDetails?.status !== 'Not Started' && potDetails?.status !== 'Paused')) {
            alert("Only authorized users can reorder members, and only if the pot has not started or is paused.");
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

    const handlePaymentChange = (userId, week, paymentType, isPaid) => {
        dispatch(updateWeeklyPayment({ potId: numPotId, userId, weekNumber: week, paymentType, isPaid }));
    };

    const handleDeletePot = async (potIdToDelete) => {
        await dispatch(potsActions.deletePot(potIdToDelete));
        navigate('/pots');
    };

    const handleBackToAdminDashboard = () => {
        if (location.state?.returnToAdmin && location.state?.fromPotDetails) {
            navigate('/dashboard', {
                state: {
                    restoreView: true,
                    viewMode: 'overview',
                    selectedPotId: location.state.selectedPotId
                }
            });
        } else {
            navigate('/dashboard');
        }
    };

    if (isLoading && !potDetails) return <LoadingSpinner message="Loading Pot Details..." />;
    if (error) return (
        <div className="container">
            <div className="alert alert-error">
                <h1>Error</h1>
                <p>{error.message}</p>
            </div>
        </div>
    );
    if (!potDetails) return null;

    const potLifecycle = getPotLifecycle(potDetails.status);
    const canEditDetails = canEditPot && potLifecycle === 'pre-active';
    const canEditOrder = canManageMembers && potLifecycle === 'pre-active' && orderedUsers.length > 1;
    const canManageWeeklyPayments = canManageMembers && potDetails.status === 'Active';
    const availableUsersForModalList = Object.values(allUsersForModal || {});

    return (
        <div className="container">
            <h1 className="pot-header">POT DETAILS</h1>

            {/* Flash Message Display */}
            {flashMessage && (
                <div className={`flash-message ${flashMessage.type}`}>
                    {flashMessage.message}
                    <button onClick={() => setFlashMessage(null)}>×</button>
                </div>
            )}

            <div className="buttons-bar">
                <div className="action-buttons-container">
                    <button
                        className="btn btn-secondary back-to-admin-dashboard-button"
                        onClick={handleBackToAdminDashboard}
                    >
                        <MdArrowBack />
                        Back to Dashboard
                    </button>
                    {canEditPot && potDetails.status === 'Not Started' && (
                        <button
                            className="btn btn-success"
                            onClick={() => handleChangeStatus('Active')}
                            disabled={isUpdatingPot || !orderedUsers.length}
                        >
                            <FaPlay />
                            Start Pot
                        </button>
                    )}
                    {canEditPot && potDetails.status === 'Paused' && (
                        <button
                            className="btn btn-success"
                            onClick={() => handleChangeStatus('Active')}
                            disabled={isUpdatingPot}
                        >
                            <FaPlay />
                            Resume Pot
                        </button>
                    )}
                    {canEditPot && potDetails.status === 'Active' && (
                        <button
                            className="btn btn-warning"
                            onClick={() => handleChangeStatus('Paused')}
                            disabled={isUpdatingPot}
                        >
                            <FaPause />
                            Pause Pot
                        </button>
                    )}
                    {canEditPot && potLifecycle !== 'terminal' && (
                        <OpenModalButton
                            buttonText={
                                <>
                                    <FaTimesCircle />
                                    Cancel Pot
                                </>
                            }
                            className="btn btn-danger"
                            modalComponent={
                                <DeleteConfirmationModal
                                    message="Are you sure you want to cancel this pot?"
                                    onConfirm={() => handleChangeStatus('Cancelled')}
                                    confirmButtonText="Yes, Cancel Pot"
                                />}
                        />
                    )}
                    {canEditPot && potDetails.status === 'Ended' && (
                        <OpenModalButton
                            buttonText={
                                <>
                                    <FaCheckCircle />
                                    Close Pot
                                </>
                            }
                            className="btn btn-purple"
                            modalComponent={
                                <DeleteConfirmationModal 
                                    message="Are you sure you want to close this pot? This is the final step and cannot be undone." 
                                    onConfirm={() => handleChangeStatus('Closed')} 
                                    confirmButtonText="Yes, Close Pot" 
                                />
                            }
                        />
                    )}
                    {canDuplicatePot && potLifecycle === 'terminal' && (
                        <button
                            className="btn btn-secondary"
                            onClick={handleDuplicatePot}
                            disabled={isUpdatingPot}
                        >
                            <FaClone />
                            Duplicate
                        </button>
                    )}
                    {canDeletePot && potDetails.status === 'Not Started' && (
                        <OpenModalButton
                            buttonText={
                                <>
                                    <FaTrashAlt />
                                    Delete Pot
                                </>
                            }
                            className="btn btn-danger"
                            modalComponent={
                                <DeleteConfirmationModal 
                                    message="Are you sure you want to delete this pot? This action cannot be undone." 
                                    onConfirm={() => handleDeletePot(numPotId)} 
                                    confirmButtonText="Yes, Delete Pot" 
                                />
                            }
                        />
                    )}
                </div>
            </div>

            {localUiError && <div className="alert alert-error"><p>{localUiError}</p></div>}
            {reorderError && <div className="alert alert-error"><p>{reorderError.message || String(reorderError)}</p></div>}
            {weekError && <div className="alert alert-error"><p>Weekly Data Error: {weekError.message || String(weekError)}</p></div>}

            <div className="card card-accent">
                <div className="card-body">
                    <div className="pot-name-div">
                        <h2 className="pot-name">{potDetails.name?.toUpperCase()}</h2>
                    </div>

                    {/* Status Summary Section */}
                    <div className="pot-status-summary">
                        <div className="status-item">
                            <span className="status-label">Current Week</span>
                            <span className="status-value">{currentWeek} / {totalWeeks > 0 ? totalWeeks : 'N/A'}</span>
                        </div>
                        <div className="status-item">
                            <span className="status-label">Banker</span>
                            <span className="status-value">{potDetails.ownerName}</span>
                        </div>
                        <div className="status-item">
                            <span className="status-label">Status</span>
                            <span className={`status-badge status-${potDetails.status?.toLowerCase().replace(' ', '-')}`}>
                                {potDetails.status}
                            </span>
                        </div>
                    </div>

                    {/* Pot Information Section */}
                    <div className="pot-info-section">
                        <h3>Pot Information</h3>
                        <div className="pot-info-grid">
                            <div className="info-item">
                                <label className="form-label info-label">Start Date</label>
                                {isEditingStartDate && canEditDetails ? (
                                    <div className="inline-edit-container">
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={editableStartDate}
                                            onChange={(e) => setEditableStartDate(e.target.value)}
                                            disabled={isUpdatingPot}
                                        />
                                        <button 
                                            className="icon-btn icon-btn-success"
                                            onClick={() => handleSavePotUpdate('startDate', editableStartDate)}
                                        >
                                            <FaSave />
                                        </button>
                                        <button 
                                            className="icon-btn icon-btn-danger"
                                            onClick={() => setIsEditingStartDate(false)}
                                        >
                                            <FaTimesCircle />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="inline-display-container">
                                        <span className="info-value">{formatDate(potDetails.startDate)}</span>
                                        {canEditDetails && !isUpdatingPot && (
                                            <button 
                                                className="icon-btn icon-btn-primary"
                                                onClick={() => setIsEditingStartDate(true)}
                                            >
                                                <FaEdit />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="info-item">
                                <label className="form-label info-label">End Date</label>
                                <span className="info-value">{formatDate(potDetails.endDate)}</span>
                            </div>

                            <div className="info-item amount-item">
                                <label className="form-label info-label">Amount per Hand</label>
                                {isEditingAmount && canEditDetails ? (
                                    <div className="inline-edit-container">
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={editableAmount}
                                            onChange={(e) => setEditableAmount(e.target.value)}
                                            disabled={isUpdatingPot}
                                            step="10"
                                            min="0"
                                        />
                                        <button 
                                            className="icon-btn icon-btn-success"
                                            onClick={() => handleSavePotUpdate('hand', editableAmount)}
                                        >
                                            <FaSave />
                                        </button>
                                        <button 
                                            className="icon-btn icon-btn-danger"
                                            onClick={() => setIsEditingAmount(false)}
                                        >
                                            <FaTimesCircle />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="inline-display-container">
                                        <span className="info-value amount-cell">{`$${Number.parseFloat(potDetails.hand || 0).toFixed(2)}`}</span>
                                        {canEditDetails && !isUpdatingPot && (
                                            <button 
                                                className="icon-btn icon-btn-primary"
                                                onClick={() => setIsEditingAmount(true)}
                                            >
                                                <FaEdit />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="info-item amount-item">
                                <label className="form-label info-label">Total Pot Amount</label>
                                <span className="info-value amount-cell">{`$${Number.parseFloat(potDetails.amount || 0).toFixed(2)}`}</span>
                            </div>

                            <div className="info-item">
                                <label className="form-label info-label">Frequency</label>
                                {isEditingFrequency && canEditDetails ? (
                                    <div className="inline-edit-container">
                                        <select
                                            className="form-select"
                                            value={editableFrequency}
                                            onChange={(e) => setEditableFrequency(e.target.value)}
                                            disabled={isUpdatingPot}
                                        >
                                            <option value="weekly">Weekly</option>
                                            <option value="every-2-weeks">Every 2 Weeks</option>
                                            <option value="monthly">Monthly</option>
                                        </select>
                                        <button 
                                            className="icon-btn icon-btn-success"
                                            onClick={() => handleSavePotUpdate('frequency', editableFrequency)}
                                        >
                                            <FaSave />
                                        </button>
                                        <button 
                                            className="icon-btn icon-btn-danger"
                                            onClick={() => setIsEditingFrequency(false)}
                                        >
                                            <FaTimesCircle />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="inline-display-container">
                                        <span className="info-value frequency-display">{potDetails.frequency?.replace('-', ' ')}</span>
                                        {canEditDetails && !isUpdatingPot && (
                                            <button 
                                                className="icon-btn icon-btn-primary"
                                                onClick={() => setIsEditingFrequency(true)}
                                            >
                                                <FaEdit />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="info-item">
                                <label className="form-label info-label">Total Members</label>
                                <span className="info-value">{orderedUsers.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card card-accent">
                <div className="card-body">
                    <div className="members-header">
                        <h3>MEMBERS</h3>
                        {canManageMembers && potLifecycle === 'pre-active' && (
                            <OpenModalButton
                                buttonText="Add Users"
                                className="btn btn-success"
                                modalComponent={
                                    <AddUsersToPot
                                        currentPotUsers={orderedUsers}
                                        availableUsers={availableUsersForModalList}
                                        onSave={handleAddUsersToModal}
                                        isSavingUsers={isAddingUsers}
                                    />
                                }
                            />
                        )}
                    </div>
                    
                    <div className="members-summary">
                        <span>Total: <strong>{orderedUsers.length}</strong></span>
                        <span>Paid: <strong>{paymentSummary.membersPaidThisWeek}</strong></span>
                        <span>Remaining: <strong>${paymentSummary.amountRemaining.toFixed(2)}</strong></span>
                    </div>
                    
                    {totalWeeks > 0 && (
                        <select
                            className="form-select"
                            value={currentWeek}
                            onChange={e => setCurrentWeek(parseInt(e.target.value))}
                            disabled={isLoadingWeek}
                        >
                            {weeksForSelect.map((weekNum, index) => (
                                <option key={weekNum} value={weekNum}>
                                    Week {weekNum} (Draw: {orderedUsers[index]?.firstName || 'N/A'})
                                </option>
                            ))}
                        </select>
                    )}
                    
                    {(isLoadingWeek || (isReordering && !isLoading)) && totalWeeks > 0 && (
                        <LoadingSpinner message={isReordering ? "Saving order..." : "Loading weekly status..."} />
                    )}
                    
                    {!isLoadingWeek && !isReordering && totalWeeks > 0 && (
                        <div className="table-container">
                            {canEditOrder && (
                                <div className="reorder-hint">
                                    <FaBars /> Touch and hold the grid icon to drag rows and reorder the draw sequence.
                                </div>
                            )}
                            <table className={`table ${isReordering ? 'reordering-active' : ''}`}>
                                <thead>
                                    <tr>
                                        {canEditOrder ? <th className="drag-handle-header"></th> : <th></th>}
                                        <th>#</th>
                                        <th>Name</th>
                                        <th>Draw Date</th>
                                        <th>Paid (Wk {currentWeek})</th>
                                        <th>Draw (Wk {currentWeek})</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderedUsers.map((user, index) => (
                                        <DraggableUserRow
                                            key={user.id.toString()}
                                            index={index}
                                            user={user}
                                            moveRow={moveRow}
                                            onDragBegin={handleDragStart}
                                            onDragOperationEnd={handleDragEnd}
                                            canBankerEditOrder={canEditOrder}
                                            currentWeek={currentWeek}
                                            weeklyStatusMap={weeklyStatusMap}
                                            handlePaymentChange={handlePaymentChange}
                                            handleRemoveUserFromPot={handleRemoveUserFromPot}
                                            currUser={currUser}
                                            potDetailsStatus={potDetails.status}
                                            canManagePayments={canManageWeeklyPayments}
                                            canManageMembers={canManageMembers}
                                            formatDate={formatDate}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    
                    {totalWeeks === 0 && !isLoadingWeek && (
                        <div className="alert alert-info">
                            <p>No members added to this pot yet. Add members to start!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PotDetailsPage;