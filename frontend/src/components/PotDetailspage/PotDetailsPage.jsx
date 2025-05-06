import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { MdPlusOne } from "react-icons/md";
import { FaCheck, FaTimes } from 'react-icons/fa';
import * as potsActions from '../../store/pots';
import { fetchWeeklyStatus, updateWeeklyPayment } from '../../store/transactions';
import { useParams } from "react-router-dom";
import './PotDetailsPage.css';

const PotDetailsPage = () => {
    const dispatch = useDispatch();
    const { potId } = useParams();
    const numPotId = parseInt(potId, 10);

    const [currentWeek, setCurrentWeek] = useState(1);

    // const [errors, setErrors] = useState({}); // Keep for pot-level errors if needed, or get from pots slice

    // --- Selectors ---
    const potDetails = useSelector(state => state.pots.currentPotDetails);
    const isLoading = useSelector(state => state.pots.isLoadingDetails);
    const error = useSelector(state => state.pots.errorDetails);
    // const isLoadingPot = !potDetails; // Simple check if potDetails not loaded

    // Select weekly data, loading, and error state from the transactions slice
    const weeklyStatusMap = useSelector(state => state.transactions.weeklyStatusByPot[numPotId]?.[currentWeek] || {});
    const weekLoadingKey = `${numPotId}_${currentWeek}`;
    const isLoadingWeek = useSelector(state => !!state.transactions.loadingWeeklyStatus[weekLoadingKey]); // Ensure boolean
    const weekError = useSelector(state => state.transactions.errorWeeklyStatus[weekLoadingKey]);

    const totalWeeks = potDetails?.Users?.length || 0;
    const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

    // --- Effect to Fetch Pot Details ---
    useEffect(() => {
        if (numPotId) {
            dispatch(potsActions.getAPotById(numPotId));
        }
    }, [dispatch, numPotId]);


   

    // --- Effect to Fetch Weekly Payment Status ---
    useEffect(() => {
        // Fetch only if we have a valid potId and the pot details seem loaded
        if (numPotId && !isLoading && potDetails) {

            dispatch(fetchWeeklyStatus(numPotId, currentWeek));
        }
    }, [dispatch, numPotId, currentWeek, isLoading, potDetails]);


    

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

    // --- Render Logic ---
    if (isLoading) {
        return (
            <div className="loading-spinner-container">
                <div className="loading-spinner"></div>
                <p>Loading Pot Details...</p>
            </div>
        );
    }

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    if (!potDetails) { // After loading and no error, if potDetails is still null
        return <div>Pot not found.</div>;
    }
    // if (isLoadingPot) { // Use pot loading state from Redux if available
    //     return <div>Loading Pot Details...</div>;
    // }

    // Use pot error state from Redux if available
    // if (potError || !potDetails) {
    //  return <div className="error">Error loading pot: {potError || "Pot data is unavailable."}</div>;
    // }
    if (!potDetails) {
        return <div className="error">Error loading pot: Pot data is unavailable.</div>;
    }


    const users = potDetails.Users || [];

    return (
        <>
            <h1 className="pot-header">Pot Details</h1>
            {/* Display Pot-level Errors if available from pots slice */}
            {/* {potError && <div className="error"><p>{potError}</p></div>} */}

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
                        <span>Pot Amount:</span> <span>{`$${Number.parseFloat(potDetails.amount || 0).toFixed(2)}`}</span>
                    </div>
                </div>
                <div className="active-div">
                    <div className="active">
                        <span>Active:</span> <span>{potDetails.active ? 'Yes' : 'No'}</span>
                    </div>
                </div>


                <div className="members-div">
                    <div className="members">
                        <span>Members</span>
                        <div>
                            <span>Total Members: {users.length}</span>
                            <button disabled> <MdPlusOne /></button>
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
                                                // disabled={isUpdatingThisUser}
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
                                                // disabled={isUpdatingThisUser}
                                                />
                                                {gotDrawStatus ? <FaCheck style={{ color: "green", marginLeft: '5px' }} /> : <FaTimes style={{ color: "red", marginLeft: '5px' }} />}
                                            </span>
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