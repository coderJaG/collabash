// src/components/GetAllUsersPage/GetAllUsersPage.jsx
import React, { useEffect, useState, useMemo } from 'react'; // Added useState and useMemo
import { useDispatch, useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom'; // Keep for Create User button if preferred over modal
import * as usersActions from '../../store/users';
import LoadingSpinner from '../LoadingSpinner';
import OpenModalButton from '../OpenModalButton';
import SignUpFormModal from '../SignUpFormModal';
import './GetAllUsersPage.css';

const USERS_PER_PAGE = 5;

const GetAllUsersPage = () => {
    const dispatch = useDispatch();
    const allUsersObject = useSelector(state => state.users.allUsers);
    const isLoading = useSelector(state => state.users.isLoadingAllUsers);
    const error = useSelector(state => state.users.errorAllUsers);
    const currUser = useSelector(state => state.session.user);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    // const [initialFetchAttempted, setInitialFetchAttempted] = useState(false); 

    useEffect(() => {
        // if (!isLoading && !error && !initialFetchAttempted && (!allUsersObject || Object.keys(allUsersObject).length === 0)) {
        //     dispatch(usersActions.getAllUsers());
        //     setInitialFetchAttempted(true);
        // }
        // Simplified fetch on mount if not already populated or to refresh.
        // will uncomment if this causes too many fetches.
        dispatch(usersActions.getAllUsers());
    }, [dispatch]);

    const usersArray = useMemo(() => allUsersObject ? Object.values(allUsersObject) : [], [allUsersObject]);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) {
            return usersArray;
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        return usersArray.filter(user =>
            (user.firstName?.toLowerCase().includes(lowerSearchTerm)) ||
            (user.lastName?.toLowerCase().includes(lowerSearchTerm)) ||
            (user.username?.toLowerCase().includes(lowerSearchTerm)) ||
            (user.email?.toLowerCase().includes(lowerSearchTerm)) ||
            (user.mobile?.toLowerCase().includes(lowerSearchTerm)) ||
            (user.role?.toLowerCase().includes(lowerSearchTerm))
        );
    }, [usersArray, searchTerm]);

    // Pagination logic
    const indexOfLastUser = currentPage * USERS_PER_PAGE;
    const indexOfFirstUser = indexOfLastUser - USERS_PER_PAGE;
    const currentUsersOnPage = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

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


    if (isLoading && usersArray.length === 0) {
        return (
            <div className="user-list-page-container">
                <h1>All Users</h1>
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="user-list-page-container error-container">
                <h1>All Users</h1>
                <p>Error fetching users: {error.message || String(error)}</p>
            </div>
        );
    }

    return (
        <div className="user-list-page-container">
            <h1>ALL USERS</h1>
            <div className="user-list-controls">
                {currUser?.role === 'banker' && (
                    <OpenModalButton
                        buttonText="Create New User"
                        modalComponent={<SignUpFormModal createdByBanker={true} />}
                        className="create-user-button-getallusers"
                    />
                )}
                <input
                    type="text"
                    placeholder="Search users (name, mobile, role...)"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="users-search-input"
                />
            </div>

            {currentUsersOnPage.length > 0 ? (
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>NAME</th>
                            <th>MOBILE</th>
                            <th>ROLE</th>
                            <th>POTS JOINED</th>
                            {/* <th>Username</th> */}
                            {/* <th>Email</th> */}
                        </tr>
                    </thead>
                    <tbody>
                    {currentUsersOnPage.map(user => {
                            const potsJoined = user.PotsJoined || [];
                            const numPotsJoined = potsJoined.length;
                            let displayPotsText = "None";
                            let hoverTitlePots = "No pots joined";

                            if (numPotsJoined > 0) {
                                displayPotsText = potsJoined[0].name;
                                if (numPotsJoined > 1) {
                                    displayPotsText += ` (+${numPotsJoined - 1} more)`;
                                }
                                hoverTitlePots = potsJoined.map(pot => pot.name).join(', ');
                            }

                            return (
                                <tr key={user.id}>
                                    <td>{user.firstName} {user.lastName}</td>
                                    <td>{user.mobile}</td>
                                    <td>{user.role}</td>
                                    <td title={hoverTitlePots} className={numPotsJoined > 0 ? "has-tooltip" : ""}>
                                        {displayPotsText}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <p>{searchTerm ? "No users match your search." : "No users found or you may not have permission to view them."}</p>
            )}

            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button onClick={goToPrevPage} disabled={currentPage === 1}>
                        Previous
                    </button>
                    {/* Page numbers (optional, can be complex for many pages) */}
                    {/* Example: Display up to 5 page numbers around current page */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(pageNumber => {
                            // Logic to show limited page numbers:
                            // Show first page, last page, and pages around current page
                            if (totalPages <= 7) return true; // Show all if 7 or less pages
                            if (pageNumber === 1 || pageNumber === totalPages) return true;
                            if (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2) return true;
                            // Add ellipsis indicators 
                            if ((pageNumber === currentPage - 3 && currentPage > 4) || (pageNumber === currentPage + 3 && currentPage < totalPages - 3)) {
                                return 'ellipsis'; // Special value for ellipsis
                            }
                            return false;
                        })
                        .map((pageNumber, index, arr) => (
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

export default GetAllUsersPage;
