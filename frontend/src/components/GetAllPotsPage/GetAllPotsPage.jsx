import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MdPlusOne, MdSend } from "react-icons/md";
import { ClipLoader } from 'react-spinners';
import { useNavigate } from "react-router-dom";
import * as potsActions from '../../store/pots';
import * as usersActions from '../../store/users';
import { createJoinRequest } from '../../store/requests';
import "./GetAllPotsPage.css";

const POTS_PER_PAGE = 5;

const GetAllPotsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currUser = useSelector(state => state.session.user);
    const isLoading = useSelector(state => state.pots.isLoadingList);
    const error = useSelector(state => state.pots.errorList);
    const allPotsMap = useSelector(state => state.pots.allById);
    const isRequestingJoin = useSelector(state => state.requests.isLoading);

    const [viewMode, setViewMode] = useState('myPots');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

  // Check for permissions from the user object
    const userPermissions = useMemo(() => new Set(currUser?.permissions || []), [currUser]);
    const canCreatePots = userPermissions.has('pot:create');
    const canRequestToJoin = userPermissions.has('request:create');

    useEffect(() => {
        dispatch(potsActions.getPots());
        dispatch(usersActions.getAllUsers()); 
    }, [dispatch]);

    const allPotsArray = useMemo(() => allPotsMap ? Object.values(allPotsMap) : [], [allPotsMap]);
    
    // const formatDate = (dateStr) => {
    //     if (!dateStr) return 'N/A';
    //     const dateObject = new Date(dateStr);
    //     if (isNaN(dateObject.getTime())) return 'Invalid Date';
    //     const month = dateObject.getUTCMonth() + 1;
    //     const day = dateObject.getUTCDate();
    //     const year = dateObject.getUTCFullYear();
    //     return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
    // };

    const handleRequestToJoin = (potId, e) => {
        e.stopPropagation();
        if (!potId) return;
        dispatch(createJoinRequest(potId));
    };
    
    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        setCurrentPage(1);
        setSearchTerm('');
    };

    const potsToDisplay = useMemo(() => {
        let pots = allPotsArray;
        
        if (viewMode === 'myPots') {
            // Use permission to check if the user can see all pots
            if (userPermissions.has('pot:view_all')) {
                pots = allPotsArray;
            } else if (currUser) {
                pots = allPotsArray.filter(pot => pot.Users?.some(user => user.id === currUser.id));
            } else {
                return [];
            }
        }
   

        if (searchTerm.trim()) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            pots = pots.filter(pot =>
                pot.name?.toLowerCase().includes(lowerSearchTerm) ||
                pot.ownerName?.toLowerCase().includes(lowerSearchTerm) ||
                pot.status?.toLowerCase().includes(lowerSearchTerm)
            );
        }

        return pots;
    }, [allPotsArray, viewMode, searchTerm, currUser, userPermissions]);

    const indexOfLastPot = currentPage * POTS_PER_PAGE;
    const indexOfFirstPot = indexOfLastPot - POTS_PER_PAGE;
    const currentPotsOnPage = potsToDisplay.slice(indexOfFirstPot, indexOfLastPot);
    const totalPages = Math.ceil(potsToDisplay.length / POTS_PER_PAGE);

    const paginate = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) setCurrentPage(pageNumber);
    };

    const goToNextPage = () => {
        setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
    };
    const goToPrevPage = () => {
        setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
    };

    if (isLoading && allPotsArray.length === 0) {
        return <div className="loading-spinner-container full-page-loader"><ClipLoader color={"#1abc9c"} loading={true} size={50} /><p>Loading Pots...</p></div>;
    }
    if (error) {
        return <div className="all-pots-page-container error-container"><h1>Error Loading Pots</h1><p>{error.message || String(error)}</p></div>;
    }
    
    const renderPotsTable = (potsToRender) => {
        if (!potsToRender || potsToRender.length === 0) {
            if (searchTerm) return <p className="no-results-message">No pots match your search.</p>;
            if (viewMode === 'findPots') return <p className="no-results-message">No public pots available to join.</p>;
            return <p className="no-results-message">You are not currently a member of any pots.</p>;
        }
        return (
            <div className="pots-container">
                <table>
                    <thead>
                        <tr>
                            <th>Pot Name</th>
                            <th>Banker</th>
                            <th>Pot Amount</th>
                            <th>Status</th>
                            {viewMode === 'findPots' && canRequestToJoin && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {potsToRender.map(pot => {
                            const isMember = pot.Users && pot.Users.some(user => user.id === currUser?.id);
                            return (
                                <tr key={pot.id} onClick={() => navigate(`/pots/${pot.id}`)} className="clickable-pot-row">
                                    <td>{pot.name}</td>
                                    <td>{pot.ownerName}</td>
                                    <td>${Number(pot.amount || 0).toFixed(2)}</td>
                                    <td>{pot.status}</td>
                                    {viewMode === 'findPots' && canRequestToJoin && (
                                        <td className="action-cell">
                                            {currUser && !isMember && (
                                                <button className="request-join-button" title="Request to Join" onClick={(e) => handleRequestToJoin(pot.id, e)} disabled={isRequestingJoin}>
                                                    <MdSend />
                                                </button>
                                            )}
                                            {isMember && <span className="member-badge">Member</span>}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="all-pots-page-container">
            <h1>POTS</h1>
            <div className="view-toggle-buttons">
                <button onClick={() => handleViewModeChange('myPots')} className={viewMode === 'myPots' ? 'active' : ''}>My Pots</button>
                <button onClick={() => handleViewModeChange('findPots')} className={viewMode === 'findPots' ? 'active' : ''}>Find New Pots</button>
            </div>
            <div className="list-controls">
                {canCreatePots && (
                    <button className="create-pot-button" onClick={() => navigate('/pots/create')} title="Create New Pot">
                        <MdPlusOne style={{ fontSize: 20, color: 'white', fontWeight: 'bold' }} />
                    </button>
                )}
                <input 
                    type="text" 
                    placeholder={viewMode === 'myPots' ? 'Search your pots...' : 'Search all pots by name, banker...'} 
                    value={searchTerm} 
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                    className="list-search-input" 
                />
            </div>
            {isLoading && allPotsArray.length > 0 && <p className="loading-refresh-message">Refreshing list...</p>}
            {renderPotsTable(currentPotsOnPage)}
            
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