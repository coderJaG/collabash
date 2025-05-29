import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState, useMemo } from "react";
// import { MdPlusOne } from "react-icons/md";
import { MdDelete } from "react-icons/md";
import { FaCheck, FaTimes } from 'react-icons/fa';
import * as potsActions from '../../store/pots';
import * as usersActions from '../../store/users';
import { fetchWeeklyStatus, updateWeeklyPayment } from '../../store/transactions';
import { useNavigate, useParams } from "react-router-dom";
import OpenModalButton from "../OpenModalButton";
import StatusUpdateModal from "../StatusUpdateModal";
import AddUsersToPot from "../AddUserToPot"; 
import LoadingSpinner from "../LoadingSpinner";
import './PotDetailsPage.css';

const STABLE_EMPTY_OPJECT = Object.freeze({});
const PotDetailsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currUser = useSelector(state => state.session.user);
    const { potId } = useParams();
    const numPotId = parseInt(potId, 10);

    const [currentWeek, setCurrentWeek] = useState(1);

    const potDetails = useSelector(state => state.pots.currentPotDetails);
    const isLoading = useSelector(state => state.pots.isLoadingDetails);
    const error = useSelector(state => state.pots.errorDetails); 
    const deletePotSuccess = useSelector(state => state.pots.deletePotSuccess);
    // const deletePotError = useSelector(state => state.pots.deletePotError); 
    const isDeleting = useSelector(state => state.pots.isDeleting);
    const isUpdatingPot = useSelector(state => state.pots.isUpdating);
    // const potUpdateError = useSelector(state => state.pots.errorUpdate);
    const allUsers = useSelector(state => state.users.allUsers);

    const weeklyStatusMap = useSelector(state => state.transactions.weeklyStatusByPot[numPotId]?.[currentWeek] || STABLE_EMPTY_OPJECT);
    const weekLoadingKey = `${numPotId}_${currentWeek}`;
    const isLoadingWeek = useSelector(state => !!state.transactions.loadingWeeklyStatus[weekLoadingKey]);
    const weekError = useSelector(state => state.transactions.errorWeeklyStatus[weekLoadingKey]); // error for weekly status fetch

    const totalWeeks = potDetails?.Users?.length || 0;
    const weeks = useMemo(() => Array.from({ length: totalWeeks }, (_, i) => i + 1), [totalWeeks]);

    useEffect(() => {
        dispatch(usersActions.getAllUsers());
    }, [dispatch]);

    useEffect(() => {
        if (numPotId) {
            dispatch(potsActions.getAPotById(numPotId));
        }
        return () => {
            dispatch(potsActions.resetDeletePotStatus());
        };
    }, [dispatch, numPotId]);

    useEffect(() => {
        if (numPotId && !isLoading && potDetails) {
            dispatch(fetchWeeklyStatus(numPotId, currentWeek));
        }
    }, [dispatch, numPotId, currentWeek, isLoading, potDetails]);

    useEffect(() => {
        let timerId;
        if (deletePotSuccess) {
            timerId = setTimeout(() => {
                navigate('/pots/');
                dispatch(potsActions.resetDeletePotStatus());
            }, 3000);
        }
        return () => clearTimeout(timerId);
    }, [deletePotSuccess, navigate, dispatch]);

    useEffect(() => {
        let timerId;
        if (error) { // This is error for pot details page itself
            timerId = setTimeout(() => {
                navigate('/pots/');
                dispatch(potsActions.clearPotDetailsError());
            }, 3000);
        }
        return () => clearTimeout(timerId);
    }, [error, navigate, dispatch]); 

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const dateObject = new Date(dateStr);
        if (isNaN(dateObject.getTime())) return 'Invalid Date';
        const month = dateObject.getMonth() + 1;
        const day = dateObject.getDate();
        const year = dateObject.getFullYear();
        return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
    };

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
        if (!potDetails || !newStatus) {
            console.warn('Cannot update status. Pot Details or new status is missing');
            return;
        }
        const potUpdateData = {
            name: potDetails.name,
            hand: potDetails.hand,
            amount: potDetails.amount,
            startDate: potDetails.startDate,
            endDate: potDetails.endDate,
            status: newStatus
        };
        try {
            dispatch(potsActions.updateAPot(potUpdateData, numPotId));
        } catch (updateError) {
            console.error("Failed to update pot status from PotDetailsPage:", updateError);
        }
    };

    const handleAddUser = async (userId) => {
        if (!potDetails || !userId) {
            console.warn('Cannot add user. Pot Details or user ID is missing');
            return;
        }
        const userData = { userId, potId: numPotId };
        try {
            await dispatch(potsActions.addUserToPot(userData));
        } catch (error) {
            console.error("Failed to add user to pot:", error);
        }
    };

    const handleRemoveUserFromPot = async (userId) => {
        if (!potDetails || !userId) {
            console.warn('Cannot delete user. Pot Details or user ID is missing');
            return;
        }
        const userData = { userId, potId: numPotId };
        if (window.confirm("Are you sure you want to remove this user from the pot? This action cannot be undone.")) {
            try {
                await dispatch(potsActions.removeUserFromPot(userData));
            } catch (error) {
                console.error("Failed to delete user from pot:", error.message);
            }
        }
    };

    if (deletePotSuccess) {
        return (
            <div className="pot-details-page-wrapper"> 
                <h1 className="pot-header">Pot Details</h1>
                <div className="buttons-bar" style={{ marginBottom: '20px', justifyContent: 'center' }}>
                    <div className="get-all-pots-button">
                        <button onClick={() => navigate('/pots/')} >All Pots</button>
                    </div>
                </div>
                <div className="success-message">Pot successfully deleted! Redirecting...</div>
            </div>
        );
    }

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error) { // This is for potDetails fetch error
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
                <h1 className="pot-header">Pot Not Found Or An Error Occurred!</h1>
                <div>Redirecting... </div>
            </div>
        );
    }

    if (!potDetails) {
        return null; // Should be caught by above conditions
    }

    const users = potDetails.Users || [];
    const hidePotDeleteButtonClassName = (potDetails && potDetails.status !== 'Not Started') ? 'hidden' : '';
    const availableStatuses = ['Active', 'Not Started', 'Ended', 'Paused', 'Closed'];
    let counter = 0; // For total members paid calculation
    const availableUsersForModal = Object.values(allUsers); 

    return (
        <div className="pot-details-page-wrapper">
            <h1 className="pot-header">POT DETAILS</h1>
            <div className="buttons-bar">
                {/* <div className="get-all-pots-button">
                    <button onClick={() => navigate('/pots/')} >All Pots</button>
                </div> */}
                <div className="action-buttons-container">
                    {currUser?.role === 'banker' && <OpenModalButton
                        buttonText="Change Status"
                        modalComponent={<StatusUpdateModal
                            currentStatus={potDetails.status}
                            onSave={handleChangeStatus}
                            availableStatuses={availableStatuses}
                            isSavingStatus={isUpdatingPot}
                        />}
                    />}
                    {currUser?.role === 'banker' && <button className={`${hidePotDeleteButtonClassName} finger-button-pointer`}
                        onClick={() => handleDeletePot(numPotId)}
                        disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete Pot'}
                    </button>}
                </div>
            </div>

            {weekError && <div className="error"><p>Weekly Data Error: {weekError.message || String(weekError)}</p></div>}

            <div className="pot-container">
                <div className="pot-name-div">
                    {/* <span>Pot Name:</span>  */}
                    <h2 className="pot-name">{potDetails.name.toUpperCase()}</h2>
                </div>
                <div className='week-display-div'> 
                    <span>Current Week:</span> <span>{currentWeek}</span>
                </div>
                <div className='banker-div'>
                    <span>Banker:</span> <span>{potDetails.ownerName}</span>
                </div>
                <div className="pot-dates-div">
                    <span>Start Date:</span> <span>{formatDate(potDetails.startDate)}</span>
                </div>
                <div className="pot-dates-div"> 
                    <span>End Date:</span> <span>{formatDate(potDetails.endDate)}</span>
                </div>
                <div className="pot-amount-div">
                    <span>Amt/Hand:</span> <span>{`$${Number.parseFloat(potDetails.hand || 0).toFixed(2)}`}</span>
                </div>
                <div className="pot-amount-div"> 
                    <span>Pot Amount:</span> <span>{`$${Number.parseFloat(potDetails.hand * (weeks.length || 0) || 0).toFixed(2)}`}</span>
                </div>
                <div className="status-div">
                    <span>Status:</span> <span>{potDetails.status}</span>
                </div>
            </div>

            <div className="members-div">
                <div className="members">
                    <span><h3>MEMBERS</h3></span>
                    <div>
                        <span>Total Members: {users.length}</span>
                        <span className="add-users-button">
                        {currUser?.role === 'banker' && <OpenModalButton
                            buttonText="Add Users"
                            modalComponent={<AddUsersToPot
                                currentPotUsers={users}
                                availableUsers={availableUsersForModal}
                                onSave={handleAddUser}
                                isSavingUsers={isUpdatingPot} 
                            />}
                        />}
                        </span>
                    </div>
                    <div>
                        <span>Total members paid: {users.reduce((acc, user) => {
                            let paidStatus = weeklyStatusMap[user.id] || { paidHand: false };
                            if (paidStatus.paidHand) acc++;
                            counter = acc; // Side effect in reduce, consider calculating after
                            return acc;
                        }, 0)}</span>
                        <span>Total paid: {`$${(Number.parseFloat(potDetails.hand || 0) * counter).toFixed(2)}`}</span>
                    </div>
                    <div>
                        <span>Remaining members: {users.length - counter}</span>
                        <span>Remaining: {`$${(Number.parseFloat(potDetails.hand * (weeks.length || 0) || 0) - (Number.parseFloat(potDetails.hand || 0) * counter)).toFixed(2)}`}</span>
                    </div>
                </div>

                <select value={currentWeek} onChange={e => setCurrentWeek(parseInt(e.target.value))} disabled={isLoadingWeek}>
                    {weeks.map(week => (
                        <option key={week} value={week}>
                            Week {week}
                        </option>
                    ))}
                </select>

                {isLoadingWeek ? (
                    <LoadingSpinner message="Loading weekly status..." />
                ) : (
                    <div className="members-table-container"> 
                        <table className="members-table"> 
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Paid Hand</th>
                                    <th>Got Draw</th>
                                    <th>Draw Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => {
                                    const userStatus = weeklyStatusMap[user.id] || { paidHand: false, gotDraw: false };
                                    const paidHandStatus = userStatus.paidHand;
                                    const gotDrawStatus = userStatus.gotDraw;

                                    return (
                                        <tr key={user.id}>
                                            <td>{user.firstName} {user.lastName}</td>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={paidHandStatus}
                                                    onChange={(e) => handlePaymentChange(user.id, currentWeek, "paidHand", e.target.checked)}
                                                    disabled={currUser?.role !== 'banker'}
                                                />
                                                {paidHandStatus ? <FaCheck style={{ color: "green", marginLeft: '5px' }} /> : <FaTimes style={{ color: "red", marginLeft: '5px' }} />}
                                            </td>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={gotDrawStatus}
                                                    onChange={(e) => handlePaymentChange(user.id, currentWeek, "gotDraw", e.target.checked)}
                                                    disabled={currUser?.role !== 'banker'}
                                                />
                                                {gotDrawStatus ? <FaCheck style={{ color: "green", marginLeft: '5px' }} /> : <FaTimes style={{ color: "red", marginLeft: '5px' }} />}
                                            </td>
                                            <td>{formatDate(user.drawDate)}</td> 
                                            <td>
                                                {currUser?.role === 'banker' && (
                                                    <button
                                                        className="finger-button-pointer"
                                                        onClick={() => handleRemoveUserFromPot(user.id)}
                                                        // disabled={currUser?.role !== 'banker'}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                                        title="Remove User from Pot"
                                                    >
                                                        <MdDelete style={{ color: "#e74c3c" }} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PotDetailsPage;
