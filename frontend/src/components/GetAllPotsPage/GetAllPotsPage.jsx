import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MdPlusOne } from "react-icons/md";
import { ClipLoader } from 'react-spinners';
import { useNavigate } from "react-router-dom";
import * as potsActions from '../../store/pots';
import "./GetAllPotsPage.css";

const POTS_PER_PAGE = 5;

const GetAllPotsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currUser = useSelector(state => state.session.user);
    const isLoading = useSelector(state => state.pots.isLoadingList);
    const error = useSelector(state => state.pots.errorList);
    const allPotsMap = useSelector(state => state.pots.allById);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [initialFetchAttempted, setInitialFetchAttempted] = useState(false);

    const allPotsArray = useMemo(() => allPotsMap ? Object.values(allPotsMap) : [], [allPotsMap]);

    useEffect(() => {

        if (!isLoading && !error && !initialFetchAttempted && allPotsArray.length === 0) {
            dispatch(potsActions.getPots());
            setInitialFetchAttempted(true);
        }
    }, [dispatch, isLoading, error, allPotsArray.length, initialFetchAttempted]);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const dateObject = new Date(dateStr);
        if (isNaN(dateObject.getTime())) return 'Invalid Date';
        const month = dateObject.getMonth() + 1;
        const day = dateObject.getDate();
        const year = dateObject.getFullYear();
        return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
    };

    // Client-side filtering based on searchTerm
    const filteredPots = useMemo(() => {
        if (!searchTerm.trim()) {
            return allPotsArray;
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        return allPotsArray.filter(pot =>
            pot.name?.toLowerCase().includes(lowerSearchTerm) ||
            pot.ownerName?.toLowerCase().includes(lowerSearchTerm) || // Search by owner name
            pot.status?.toLowerCase().includes(lowerSearchTerm) ||
            pot.amount?.toString().includes(lowerSearchTerm) // Search by amount
        );
    }, [allPotsArray, searchTerm]);

    // Filter pots for standard users after search filter
    // This ensures standard users only see pots they are part of, from the already search-filtered list.
    const potsToDisplayForRole = useMemo(() => {
        if (currUser?.role === 'banker') {
            return filteredPots;
        } else if (currUser) {
            return filteredPots.filter(pot =>
                pot.Users && pot.Users.some(user => user.id === currUser.id)
            );
        }
        return []; // No user, no pots
    }, [filteredPots, currUser]);


    // Pagination logic based on potsToDisplayForRole
    const indexOfLastPot = currentPage * POTS_PER_PAGE;
    const indexOfFirstPot = indexOfLastPot - POTS_PER_PAGE;
    const currentPotsOnPage = potsToDisplayForRole.slice(indexOfFirstPot, indexOfLastPot);
    const totalPages = Math.ceil(potsToDisplayForRole.length / POTS_PER_PAGE);

    const paginate = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };
    const goToNextPage = () => {
        setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
    };
    const goToPrevPage = () => {
        setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
    };


    if (isLoading && allPotsArray.length === 0 && !initialFetchAttempted) {
        return (
            <div className="loading-spinner-container full-page-loader"> {/* Added full-page-loader class */}
                <ClipLoader color={"#1abc9c"} loading={true} size={50} aria-label="Loading Spinner" />
                <p>Loading Pots...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="all-pots-page-container error-container"> {/* Ensure class consistency */}
                <h1>Error Loading Pots</h1> {/* Changed title */}
                <p>{error.message || String(error)} {error.status && `(Status: ${error.status})`}</p>
            </div>
        );
    }

    const showPotsTable = (potsToRender) => {
        if (!potsToRender || potsToRender.length === 0) {
            if (searchTerm) return <p className="no-results-message">No pots match your search criteria.</p>;
            if (currUser?.role === 'banker') return <p className="no-results-message">No pots found. Start by creating one!</p>;
            return <p className="no-results-message">You are not currently a member of any pots, or no pots are available.</p>;
        }
        return (
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
                        {potsToRender.map(pot => (
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
    };

    return (
        <div className="all-pots-page-container">
            <h1>POTS</h1>
            <div className="list-controls">
                    {currUser && currUser.role === 'banker' && (
                        <button
                            className="create-pot-button finger-pointer"
                            onClick={() => navigate('/pots/create')}
                            title="Create New Pot"
                        >
                            <MdPlusOne style={{ fontSize: 20, color: 'white', fontWeight: 'bold' }} />
                        </button>
                    )}
                    <input
                        type="text"
                        placeholder="Search pots (name, owner, status...)"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="list-search-input"
                    />
            </div>

            {isLoading && (allPotsArray.length > 0 || initialFetchAttempted) && <p className="loading-refresh-message">Refreshing list...</p>}
            {showPotsTable(currentPotsOnPage)}

            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button onClick={goToPrevPage} disabled={currentPage === 1}>
                        Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(pageNumber => {
                            if (totalPages <= 7) return true;
                            if (pageNumber === 1 || pageNumber === totalPages) return true;
                            if (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2) return true;
                            if ((pageNumber === currentPage - 3 && currentPage > 4) || (pageNumber === currentPage + 3 && currentPage < totalPages - 3)) {
                                return 'ellipsis';
                            }
                            return false;
                        })
                        .map((pageNumber, index) => (
                            pageNumber === 'ellipsis' ?
                                <span key={`ellipsis-${index}`} className="page-ellipsis">...</span> :
                                <button
                                    key={pageNumber}
                                    onClick={() => paginate(pageNumber)}
                                    className={`page-number ${currentPage === pageNumber ? 'active' : ''}`}
                                >
                                    {pageNumber}
                                </button>
                        ))
                    }
                    <button onClick={goToNextPage} disabled={currentPage === totalPages}>
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default GetAllPotsPage;
