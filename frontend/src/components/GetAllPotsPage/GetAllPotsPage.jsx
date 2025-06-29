import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MdPlusOne, MdSend, MdHourglassTop } from "react-icons/md";
import { ClipLoader } from 'react-spinners';
import { useNavigate } from "react-router-dom";
import * as potsActions from '../../store/pots';
import * as usersActions from '../../store/users';
import { createJoinRequest, fetchSentRequests } from '../../store/requests';
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
    const sentRequests = useSelector(state => state.requests.sentRequests);
    const isLoadingRequests = useSelector(state => state.requests.loadingRequests);

    const [viewMode, setViewMode] = useState('myPots');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasInitializedRequests, setHasInitializedRequests] = useState(false);

    const userPermissions = useMemo(() => new Set(currUser?.permissions || []), [currUser]);
    const canCreatePots = userPermissions.has('pot:create');
    const canRequestToJoin = userPermissions.has('request:create');
    // Enhanced initialization effect
    useEffect(() => {
        const initializeData = async () => {
            // Always fetch pots and users
            dispatch(potsActions.getPots());
            dispatch(usersActions.getAllUsers());
            
            // Fetch sent requests for any user who can create requests
            if (canRequestToJoin) {
                await dispatch(fetchSentRequests());
                setHasInitializedRequests(true);
            } else {
                // For users who can't create requests, mark as initialized immediately
                setHasInitializedRequests(true);
            }
        };

        if (currUser) {
            initializeData();
        }
    }, [dispatch, currUser, canRequestToJoin]);

    const allPotsArray = useMemo(() => allPotsMap ? Object.values(allPotsMap) : [], [allPotsMap]);
    
    const pendingRequestPotIds = useMemo(() => {
        return new Set(
            Object.values(sentRequests)
                .filter(req => req.status === 'pending')
                .map(req => req.potId)
        );
    }, [sentRequests]);

    const handleRequestToJoin = async (potId, e) => {
        e.stopPropagation();
        if (!potId) return;
        
        try {
            await dispatch(createJoinRequest(potId));
            // The createJoinRequest thunk already calls fetchSentRequests()
        } catch (error) {
            console.error('Error creating join request:', error);
        }
    };
    
    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        setCurrentPage(1);
        setSearchTerm('');
    };

    const potsToDisplay = useMemo(() => {
        let pots = allPotsArray;
        
        if (viewMode === 'myPots') {
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

    // Enhanced loading condition that accounts for requests initialization
    const isInitialLoading = isLoading && allPotsArray.length === 0;
    const isRequestsLoading = canRequestToJoin && !hasInitializedRequests;
    const shouldShowLoading = isInitialLoading || isRequestsLoading;

    if (shouldShowLoading) {
        return (
            <div className="loading-spinner-container full-page-loader">
                <ClipLoader color={"#1abc9c"} loading={true} size={50} />
                <p>Loading Pots...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="all-pots-page-container error-container">
                <h1>Error Loading Pots</h1>
                <p>{error.message || String(error)}</p>
            </div>
        );
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
                            const hasPendingRequest = pendingRequestPotIds.has(pot.id);

                            return (
                                <tr key={pot.id} onClick={() => navigate(`/pots/${pot.id}`)} className="clickable-pot-row">
                                    <td>{pot.name}</td>
                                    <td>{pot.ownerName}</td>
                                    <td>${Number(pot.amount || 0).toFixed(2)}</td>
                                    <td>{pot.status}</td>
                                    {viewMode === 'findPots' && canRequestToJoin && (
                                        <td className="action-cell">
                                            {isMember ? (
                                                <span className="member-badge">Member</span>
                                            ) : !hasInitializedRequests ? (
                                                <ClipLoader color={"#1abc9c"} size={20} />
                                            ) : hasPendingRequest ? (
                                                <button className="request-join-button pending" disabled title="Request Pending">
                                                    <MdHourglassTop />
                                                </button>
                                            ) : (
                                                <button 
                                                    className="request-join-button" 
                                                    title="Request to Join" 
                                                    onClick={(e) => handleRequestToJoin(pot.id, e)} 
                                                    disabled={isRequestingJoin}
                                                >
                                                    {isRequestingJoin ? <ClipLoader color={"white"} size={16} /> : <MdSend />}
                                                </button>
                                            )}
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
                <button onClick={() => handleViewModeChange('myPots')} className={viewMode === 'myPots' ? 'active' : ''}>
                    My Pots
                </button>
                <button onClick={() => handleViewModeChange('findPots')} className={viewMode === 'findPots' ? 'active' : ''}>
                    Find New Pots
                </button>
            </div>
            <div className="list-controls">
                {canCreatePots && (
                    <button className="create-pot-button" onClick={() => navigate('/pots/create')} title="Create New Pot">
                        <MdPlusOne style={{ fontSize: 20, color: 'white', fontWeight: 'bold' }} />
                    </button>
                )}
                <input 
                    type="text" 
                    placeholder={viewMode === 'myPots' ? 'Search your pots...' : 'Search all pots...'} 
                    value={searchTerm} 
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                    className="list-search-input" 
                />
            </div>
            
            {/* Show loading message only when refreshing existing data */}
            {(isLoading || isLoadingRequests) && allPotsArray.length > 0 && hasInitializedRequests && (
                <p className="loading-refresh-message">Refreshing list...</p>
            )}
            
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
                            if ((pageNumber === currentPage - 3 && currentPage > 4) || (pageNumber === currentPage + 3 && currentPage < totalPages - 3)) return 'ellipsis';
                            return false;
                        })
                        .map((pageNumber, index, arr) => (
                           pageNumber === 'ellipsis' ?
                           <span key={`ellipsis-${index}`} className="page-ellipsis">...</span> :
                           <button key={pageNumber} onClick={() => paginate(pageNumber)} className={`page-number ${currentPage === pageNumber ? 'active' : ''}`}>
                               {pageNumber}
                           </button>
                        ))
                    }
                    <button onClick={goToNextPage} disabled={currentPage === totalPages}>Next</button>
                </div>
            )}
        </div>
    );
};

export default GetAllPotsPage;