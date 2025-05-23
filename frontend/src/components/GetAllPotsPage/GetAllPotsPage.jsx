import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MdPlusOne } from "react-icons/md";
import { ClipLoader, BarLoader, PuffLoader } from 'react-spinners';
import { useNavigate } from "react-router-dom";
import * as potsActions from '../../store/pots'
import "./GetAllPotsPage.css";


const GetAllPotsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currUser = useSelector(state => state.session.user);
    const isLoading = useSelector(state => state.pots.isLoadingList);
    const error = useSelector(state => state.pots.errorList);
    const allPotsMap = useSelector(state => state.pots.allById);

    const [initialFetchAttempted, setInitialFetchAttempted] = useState(false);

    //convert allPotsMap to an array
    const allPotsArray = allPotsMap ? Object.values(allPotsMap) : [];

    useEffect(() => {
        if (!isLoading && !error && !initialFetchAttempted && allPotsArray.length === 0) {
            dispatch(potsActions.getPots());
            setInitialFetchAttempted(true);
        }
    }, [dispatch, isLoading, error, allPotsArray.length, initialFetchAttempted]);


    //format dates helper
    const formatDate = (dateStr) => {
        const dateObject = new Date(dateStr);
        const month = dateObject.getMonth() + 1
        const day = dateObject.getDate();
        const year = dateObject.getFullYear();
        const result = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
        return result;
    }

    // Filter pots for standard users - calculated outside JSX
    let potsForStandardUser = [];
    if (currUser && currUser.role !== 'banker' && allPotsArray.length > 0) {
        potsForStandardUser = allPotsArray.filter(pot =>
            pot.Users && pot.Users.some(user => user.id === currUser.id)
        );
    }

    // Show loading spinner if data is being fetched
    if (isLoading && allPotsArray.length === 0) { // Show full page loader only if no data is present yet
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', padding: '20px' }}>
                <ClipLoader color={"#588157"} loading={true} size={50} aria-label="Loading Spinner" />
                <p style={{ marginTop: '10px', color: '#555' }}>Loading Pots...</p>
                {/*PuffLoader )
                <PuffLoader color={"#36D7B7"} loading={true} size={60} />
                <p style={{ marginTop: '10px', color: '#555' }}>Loading Pot Details...</p>
                */}

                {/* BarLoader )
                <BarLoader color={"#588157"} loading={true} height={4} width={100} />
                <p style={{ marginTop: '10px', color: '#555' }}>Loading Pot Details...</p>
                */}
            </div>
        );
    }

    if (error) {
        return (
            <>
                <h1 className="pot-header">Error Loading Pots!!!</h1>
                <div className="error">
                    <p> {error.message || String(error)} {error.status && `${error.status}`}</p>

                </div>;
            </> 
        );
    }




    const showPotsTable = (potsToDisplay) => (
        <div className="pots-container">
            <table>
                <thead>
                    <tr>
                        <th>Pot</th>
                        <th>Amount</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {potsToDisplay.map(pot => (
                        <tr className='finger-pointer clickable-pot-row' key={pot.id} onClick={() => navigate(`/pots/${pot.id}`)}>
                            <td>{pot.name}</td>
                            <td>${Number(pot.amount || 0).toFixed(2)}</td>
                            <td>{formatDate(pot.startDate)}</td>
                            <td>{formatDate(pot.endDate)}</td>
                            <td>{pot.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    let potsContent;
    if (currUser) {
        if (currUser.role === 'banker') {
            if (allPotsArray.length > 0) {
                potsContent = showPotsTable(allPotsArray);
            } else if (!isLoading) { // Only show if not loading and still no pots
                potsContent = <p>No pots found. Start by creating one!</p>;
            }
        } else { // Standard user
            if (potsForStandardUser.length > 0) {
                potsContent = showPotsTable(potsForStandardUser);
            } else if (!isLoading) { // Only show if not loading and still no pots
                potsContent = <p>You are not currently a member of any pots.</p>;
            }
        }
    } else { // No current user
        potsContent = <p>Please log in to view pots.</p>;
    }
    return (
        <div className="all-pots-page-container"> {/* Changed class name for clarity */}
            <div className="all-pots-header-container">
                <h1>POTS</h1>
                {currUser && currUser.role === 'banker' && ( // Show create button only to bankers
                    <button
                        className="create-pot-button finger-pointer"
                        onClick={() => navigate('/pots/create')}
                        title="Create New Pot"
                    >
                        <MdPlusOne style={{ fontSize: 20, color: 'white', fontWeight: 'bold' }} />
                    </button>
                )}
            </div>
            {isLoading && allPotsArray.length > 0 && <p>Refreshing list...</p>} {/* Indicate refresh if already showing data */}
            {potsContent}
        </div>
    );
};


export default GetAllPotsPage;