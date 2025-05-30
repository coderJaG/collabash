// src/components/GetAllUsersPage/GetAllUsersPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom'; 
import * as usersActions from '../../store/users';
import LoadingSpinner from '../LoadingSpinner';
import OpenModalButton from '../OpenModalButton';
import SignUpFormModal from '../SignUpFormModal';
import './GetAllUsersPage.css';

const USERS_PER_PAGE = 5;

const GetAllUsersPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate(); 
    const allUsersObject = useSelector(state => state.users.allUsers);
    const isLoading = useSelector(state => state.users.isLoadingAllUsers);
    const error = useSelector(state => state.users.errorAllUsers);
    const currUser = useSelector(state => state.session.user);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
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

    const handleUserNameClick = (targetUser) => {
        if (!currUser) return;

        if (currUser.role === 'banker' || currUser.id === targetUser.id) {
            navigate(`/users/${targetUser.id}`);
        } else {
            // Optionally, provide feedback if a standard user clicks on someone else
            // For now, it does nothing as per implicit requirement
            console.log("Standard users can only view their own profile page directly from this list.");
        }
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
                    placeholder="Search users..."
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

                            // Determine if the current user can view the profile
                            // A banker can view any user's profile, while a standard user can only view their own
                            const canViewProfile = currUser?.role === 'banker' || currUser?.id === user.id;

                            return (
                                <tr key={user.id}>
                                    <td
                                        className={canViewProfile ? "user-name-link" : ""}
                                        onClick={canViewProfile ? () => handleUserNameClick(user) : undefined}
                                        title={canViewProfile ? `View ${user.firstName}'s profile` : undefined}
                                    >
                                        {user.firstName} {user.lastName}
                                    </td>
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

export default GetAllUsersPage;
