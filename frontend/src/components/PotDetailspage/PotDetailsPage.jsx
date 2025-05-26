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
import GetAllUsers from "../GetAllUsersPage";
import './PotDetailsPage.css';

const STABLE_EMPTY_OPJECT = Object.freeze({});
const PotDetailsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currUser = useSelector(state => state.session.user);
    const { potId } = useParams();
    const numPotId = parseInt(potId, 10); //enure pot id is an int

    const [currentWeek, setCurrentWeek] = useState(1);


    // const [errors, setErrors] = useState({}); // Keep for pot-level errors if needed, or get from pots slice

    // --- Selectors ---
    const potDetails = useSelector(state => state.pots.currentPotDetails);
    const isLoading = useSelector(state => state.pots.isLoadingDetails);
    const error = useSelector(state => state.pots.errorDetails);
    const deletePotSuccess = useSelector(state => state.pots.deletePotSuccess);
    const deletePotError = useSelector(state => state.pots.deletePotError);
    const isDeleting = useSelector(state => state.pots.isDeleting);
    const isUpdatingPot = useSelector(state => state.pots.isUpdating); // Loading for any pot update, including status
    const potUpdateError = useSelector(state => state.pots.errorUpdate); // Error specifically for pot updates
    const allUsers = useSelector(state => state.users.allUsers)

    // Select weekly data, loading, and error state from the transactions slice
    const weeklyStatusMap = useSelector(state => state.transactions.weeklyStatusByPot[numPotId]?.[currentWeek] || STABLE_EMPTY_OPJECT);
    const weekLoadingKey = `${numPotId}_${currentWeek}`;
    const isLoadingWeek = useSelector(state => !!state.transactions.loadingWeeklyStatus[weekLoadingKey]); // Ensure boolean
    const weekError = useSelector(state => state.transactions.errorWeeklyStatus[weekLoadingKey]);
    const totalWeeks = potDetails?.Users?.length || 0;
    const weeks = useMemo(() => Array.from({ length: totalWeeks }, (_, i) => i + 1), [totalWeeks]);




    // --- fetch all users when component mounts ---
    useEffect(() => {
        dispatch(usersActions.getAllUsers());
    }, [dispatch])



    // --- Effect to Fetch Pot Details ---
    useEffect(() => {
        if (numPotId) {
            dispatch(potsActions.getAPotById(numPotId));
        }
        return () => {
            dispatch(potsActions.resetDeletePotStatus()); // reset delete status if user navigates away before delete redirect completes.
        }
    }, [dispatch, numPotId]);


    // --- Effect to Fetch Weekly Payment Status ---
    useEffect(() => {
        // Fetch only if we have a valid potId and the pot details seem loaded
        if (numPotId && !isLoading && potDetails) {
            dispatch(fetchWeeklyStatus(numPotId, currentWeek));
        }
    }, [dispatch, numPotId, currentWeek, isLoading, potDetails]);


    //handle confirmation after pot delete
    useEffect(() => {
        let timerId;
        if (deletePotSuccess) { // Use the flag from Redux store
            timerId = setTimeout(() => {
                navigate('/pots/');
                dispatch(potsActions.resetDeletePotStatus()); // Reset Redux state after navigation
            }, 3000); // Display success message for 3 seconds
        }
        return () => { // Cleanup function for the timer
            clearTimeout(timerId);
        };
    }, [deletePotSuccess, navigate, dispatch]);

    // --- Handle redirection on error ---
useEffect(() => {
    let timerId;
    if (error) { 
        timerId = setTimeout(() => {
            navigate('/pots/'); // Redirect to the all pots page
            dispatch(potsActions.clearPotDetailsError()); // Clear the error in Redux store
        }, 3000); // 3000 milliseconds = 3 seconds
    }
    return () => { // Cleanup function for the timer
        clearTimeout(timerId);
    };
}, [error, navigate]);

    //format date to MM/DD/YYYY
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const dateObject = new Date(dateStr);
        if (isNaN(dateObject.getTime())) return 'Invalid Date'; // Check for invalid date
        const month = dateObject.getMonth() + 1;
        const day = dateObject.getDate();
        const year = dateObject.getFullYear();
        return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
    };

    //handle paid and draw checkboxes
    const handlePaymentChange = (userId, week, paymentType, isPaid) => {
        const transactionData = {
            potId: numPotId,
            userId,
            week,
            paymentType,
            isPaid
        };
        dispatch(updateWeeklyPayment(transactionData));
    };


    //handle delete pot button
    const handleDeletePot = async (potIdToDelete) => {
        if (window.confirm("Are you sure you want to delete this pot? This action cannot be undone.")) {
            dispatch(potsActions.deletePot(potIdToDelete));
        }
    };

    //handle change status button 
    const handleChangeStatus = async (newStatus) => {

        if (!potDetails || !newStatus) {
            console.warn('Cannot update status. Pot Details or new status us missing')
            return
        }

        const potUpdateData = {
            name: potDetails.name,
            hand: potDetails.hand,
            amount: potDetails.amount,
            startDate: potDetails.startDate,
            endDate: potDetails.endDate,
            status: newStatus
        }

        try {
            dispatch(potsActions.updateAPot(potUpdateData, numPotId))
        } catch (updateError) {
            console.error("Failed to update pot status from PotDetailsPage:")
        }
    }

    const handleAddUser = async (userId) => {
        if (!potDetails || !userId) {
            console.warn('Cannot add user. Pot Details or user ID is missing');
            return;
        }
        const userData = {
            userId,
            potId: numPotId
        };
        try {
            await dispatch(potsActions.addUserToPot(userData));
            // Optionally, you can also fetch the updated pot details after adding a user
            // dispatch(potsActions.getAPotById(numPotId));
        } catch (error) {
            console.error("Failed to add user to pot:", error);
        }
    };
    const handleRemoveUserFromPot = async (userId) => {
        if (!potDetails || !userId) {
            console.warn('Cannot delete user. Pot Details or user ID is missing');
            return;
        }
        const userData = {
            userId,
            potId: numPotId
        };
        try {

            if (window.confirm("Are you sure you want to remove this user from the pot? This action cannot be undone.")) {
                await dispatch(potsActions.removeUserFromPot(userData));
            }
        } catch (error) {
            console.error("Failed to delete user from pot:", error.message);
        }
    };



    // --- Render Logic ---

    if (deletePotSuccess) {
        return (
            <>
                <h1 className="pot-header">Pot Details</h1>
                {/* Minimal UI during redirect */}
                <div className="buttons-bar" style={{ marginBottom: '20px' }}>
                    <div className="get-all-pots-button">
                        <button onClick={() => navigate('/pots/')} >All Pots</button>
                    </div>
                </div>
                <div className="success-message">Pot successfully deleted! Redirecting...</div>
            </>
        );
    }

    if (isLoading) {
        return (<>
            <div className="pot-header">Pot Details</div>
            <div className="loading-spinner-container">
                <div className="loading-spinner"></div>
                <p>Loading Pot Details...</p>
            </div>
        </>
        );
    }

    if (error) {
        let timerId;
        return (
            <>
                <h1 className="pot-header">Error Loading Pot!!!</h1>
                <div className="error">
                    <p> {error.message || "An unexpected error occured!!!"} {error.status && `${error.status}`}</p>
                    <p>Redirecting to All Pots Page...</p>
                </div>;
            </>
        )
    }

    if (!potDetails && !isLoading) { // After loading and no error, if potDetails is still null
        return (<>
            <h1 className="pot-header">Pot Not Found Or An Error Occurred!!!</h1>

            <div>Redirecting... </div>
            {/* {navigate('/pots/')} */}
            {/* Optionally, you can add a button to navigate back to pots */}

        </>
        );
    }

    //just in case there is an off case where errors are not caught 
    if (!potDetails) {
        return null
    }

    //user data
    const users = potDetails.Users || [];

    // set hidden status for delete button if pot active state  = false
    const hidePotDeleteButtonClassName = (potDetails && potDetails.status !== 'Not Started') ? 'hidden' : '';
    //available status for change status modal
    const availableStatuses = ['Active', 'Not Started', 'Ended', 'Paused', 'Closed'];

    //counter tracker used in calculating total members already paid and total amount already paid
    let counter = 0;


    //convert allUsers to an array
    const availableUsers = Object.values(allUsers)


    return (
        <>
            <h1 className="pot-header">Pot Details</h1>
            {/* buttons bar */}
            <div className="buttons-bar">
                <div className="get-all-pots-button">
                    <button onClick={() => navigate('/pots/')} >All Pots</button>
                </div>
                <div>

                </div>
                <div className="action-buttons-container">
                    {currUser.role === 'banker' && <OpenModalButton
                        buttonText="Change Status"
                        modalComponent={<StatusUpdateModal // change status modal
                            currentStatus={potDetails.status}
                            onSave={handleChangeStatus}
                            availableStatuses={availableStatuses}
                            isSavingStatus={isUpdatingPot}
                        />}
                    />}
                    {currUser.role === 'banker' && <button className={`${hidePotDeleteButtonClassName} finger-button-pointer`} // delete a pot button
                        onClick={() => handleDeletePot(numPotId)}
                        disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete Pot'}
                    </button>}
                </div>
            </div>

            {/* {potError && <div className="error"><p>{potError}</p></div>} */}
            {/* {deletePotError && <div className="error">Error deleting pot: {deletePotError}</div>} */}
            {/* Display Weekly Load/Update Errors from transactions slice */}
            {weekError && <div className="error"><p>Weekly Data Error: {weekError}</p></div>}


            <div className="pot-container">
                {/* ... (rest of the pot detail display: Banker, Name, Dates, Amounts, Active) ... */}
                <div className='banker-div'>
                    <div className="banker"><span>Banker:</span> <span>{potDetails.ownerName}</span></div>
                    <span>Week {currentWeek}</span>
                </div>
                <div className="pot-name-div">
                    <div><span className="pot-name-header">Pot Name:</span> <span className="pot-name">{potDetails.name}</span>
                    </div>
                </div>
                <div className="pot-dates-div">
                    <div className="pot-date-start">
                        <span>Start Date:</span> <span>{formatDate(potDetails.startDate)}</span>
                    </div>
                    <div className="pot-date-end"> <span>End Date:</span> <span>{formatDate(potDetails.endDate)}</span></div>
                </div>
                <div className="pot-amount-div">
                    <div className="hand-amount">
                        <span>Amt/Hand:</span> <span>{`$${Number.parseFloat(potDetails.hand || 0).toFixed(2)}`}</span>
                    </div>
                    <div className="pot-amount">
                        <span>Pot Amount:</span> <span>{`$${Number.parseFloat(potDetails.hand * weeks.length || 0).toFixed(2)}`}</span>
                    </div>
                </div>
                <div className="status-div">
                    <div className="status">
                        <span>Status:</span> <span>{potDetails.status}</span>
                    </div>
                </div>


                <div className="members-div">
                    <div className="members">
                        <span>Members</span>
                        <div>
                            <span>Total Members: {users.length}</span>
                            {currUser.role === 'banker' && <OpenModalButton
                                buttonText="Add Users"
                                modalComponent={<GetAllUsers // add user modal
                                    currentPotUsers={users}
                                    availableUsers={availableUsers}
                                    onSave={handleAddUser}
                                    isSavingUsers={isUpdatingPot}
                                />}
                            />}
                            {/* <button > <MdPlusOne /></button> */}
                        </div>
                        <div>
                            <span>Total members paid: {users.reduce((acc, user) => {
                                let paidStatus = weeklyStatusMap[user.id] || { paidHand: false, gotDraw: false };
                                if (paidStatus.paidHand) acc++
                                counter = acc
                                return acc
                            }, 0)}</span>
                            <span>Total paid: {`$${potDetails.hand * counter}`}</span>
                        </div>
                        <div>
                            <span>Remaining members: {users.length - counter}</span>
                            <span>Remaining: {`$${potDetails.amount - potDetails.hand * counter}`}</span>
                        </div>
                    </div>
                    {/* Disable selector while loading weekly data */}
                    <select value={currentWeek} onChange={e => setCurrentWeek(parseInt(e.target.value))} disabled={isLoadingWeek}>
                        {weeks.map(week => (
                            <option key={week} value={week}>
                                Week {week}
                            </option>
                        ))}
                    </select>

                    {/* Show loading indicator based on Redux state */}
                    {isLoadingWeek ? (
                        <div>Loading weekly status...</div>
                    ) : (
                        <div className="members-list-div">
                            <ul className="members-list">
                                <li className="member-header">
                                    <span>Name</span>
                                    <span>Paid Hand</span>
                                    <span>Got Draw</span>
                                    <span> Draw Date</span>
                                    <span>Actions</span>
                                </li>
                                {/* Map over users from potDetails */}
                                {users.map(user => {
                                    // Get the status for this user from the Redux state map
                                    const userStatus = weeklyStatusMap[user.id] || { paidHand: false, gotDraw: false };
                                    const paidHandStatus = userStatus.paidHand;
                                    const gotDrawStatus = userStatus.gotDraw;

                                    return (
                                        <li key={user.id}>
                                            <span>{user.firstName} {user.lastName}</span>
                                            <span>
                                                <input
                                                    type="checkbox"
                                                    // Read checked status from Redux state
                                                    checked={paidHandStatus}
                                                    // Dispatch action on change
                                                    onChange={(e) => handlePaymentChange(user.id, currentWeek, "paidHand", e.target.checked)}
                                                    // aria-label={`Paid Hand for ${user.firstName} ${user.lastName}`}
                                                    // Optional: Disable input while an update for THIS user is pending
                                                    disabled={currUser.role !== 'banker'}
                                                />
                                                {paidHandStatus ? <FaCheck style={{ color: "green", marginLeft: '5px' }} /> : <FaTimes style={{ color: "red", marginLeft: '5px' }} />}

                                            </span>
                                            <span>
                                                <input
                                                    type="checkbox"
                                                    checked={gotDrawStatus}
                                                    onChange={(e) => handlePaymentChange(user.id, currentWeek, "gotDraw", e.target.checked)}
                                                    // aria-label={`Got Draw for ${user.firstName} ${user.lastName}`}
                                                    // Optional: Disable input while an update for THIS user is pending
                                                    disabled={currUser.role !== 'banker'}
                                                />
                                                {gotDrawStatus ? <FaCheck style={{ color: "green", marginLeft: '5px' }} /> : <FaTimes style={{ color: "red", marginLeft: '5px' }} />}
                                            </span>
                                            <span>{user.drawDate}</span>
                                            <span>
                                                <button
                                                    className="finger-button-pointer"
                                                    onClick={() => handleRemoveUserFromPot(user.id)}
                                                    disabled={currUser.role !== 'banker'}
                                                    style={{ background: 'none', border: 'none', cursor: currUser.role === 'banker' ? 'pointer' : 'not-allowed' }}
                                                >
                                                    <MdDelete />
                                                </button>
                                            </span> {/* delete user icon */}
                                            {/* <button onClick={() => handleDeleteUser(user.id)}>Delete</button> */}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default PotDetailsPage;