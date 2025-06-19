import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { MdDelete } from 'react-icons/md';
import * as usersActions from '../../store/users';
import * as sessionActions from '../../store/session';
import LoadingSpinner from '../LoadingSpinner';
import OpenModalButton from '../OpenModalButton';
import SignUpFormModal from '../SignUpFormModal';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import './GetAllUsersPage.css';

const USERS_PER_PAGE = 2; // will increase for production, but 2 is good for testing

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
        const lowerSearchTerm = searchTerm.trim().toLowerCase();
        return usersArray.filter(user =>
            (user.firstName?.toLowerCase().includes(lowerSearchTerm)) ||
            (user.lastName?.toLowerCase().includes(lowerSearchTerm)) ||
            (`${user.firstName} ${user.lastName}`.toLowerCase().includes(lowerSearchTerm)) ||
            (`${user.lastName} ${user.firstName}`.toLowerCase().includes(lowerSearchTerm)) ||
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
            console.log("Standard users can only view their own profile page directly from this list.");
        }
    };

    const handleDeleteUser = async (userIdToDelete) => {
        if (!userIdToDelete) return;
        try {
            await dispatch(usersActions.deleteUserById(userIdToDelete));
            if (currUser && currUser.id === userIdToDelete) {
                dispatch(sessionActions.logout());
                navigate('/');
            }
            if (currentUsersOnPage.length === 1 && currentPage > 1 && filteredUsers.length - 1 <= (currentPage - 1) * USERS_PER_PAGE) {
                setCurrentPage(currentPage - 1);
            }
        } catch (err) {
            console.error("Failed to delete user:", err);
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
                        className="create-user-button"
                        modalComponent={<SignUpFormModal createdByBanker={true} />}
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
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentUsersOnPage.map(user => {
                            const potsJoined = user.PotsJoined || [];
                            const numPotsJoined = potsJoined.length;
                            const canViewProfile = currUser?.role === 'banker' || currUser?.id === user.id;

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
                                    <td
                                        className={canViewProfile ? "user-name-link" : ""}
                                        onClick={canViewProfile ? () => handleUserNameClick(user) : undefined}
                                        title={canViewProfile ? `View ${user.firstName}'s profile` : "Permission denied"}
                                    >
                                        {user.firstName} {user.lastName}
                                    </td>
                                    <td>{user.mobile}</td>
                                    <td>{user.role}</td>
                                    <td title={hoverTitlePots} className={numPotsJoined > 0 ? "has-tooltip" : ""}>
                                        {displayPotsText}
                                    </td>
                                    <td className="actions-cell">
                                        {(() => {
                                            // Determine if a button should be shown and its state (active/disabled)
                                            const isOwnProfile = currUser?.id === user.id;
                                            const isBanker = currUser?.role === 'banker';
                                            const isStandard = currUser?.role === 'standard';
                                            
                                            // A button is potentially visible if the current user is a banker,
                                            // or if they are a standard user viewing their own row.
                                            const isEligibleForButton = isBanker || (isStandard && isOwnProfile);

                                            if (!isEligibleForButton) {
                                                // If not eligible, render a placeholder to maintain alignment
                                                return <div className="action-placeholder" />;
                                            }

                                            // Determine if the button should be disabled
                                            const isAssociatedWithPots = numPotsJoined > 0;
                                            const isDisabled = isAssociatedWithPots || (isBanker && isOwnProfile);

                                            let title = "";
                                            if (isBanker && isOwnProfile) {
                                                title = "Bankers cannot delete their own account from this panel.";
                                            } else if (isAssociatedWithPots) {
                                                title = `Cannot delete: ${user.firstName} is associated with active pots.`;
                                            } else {
                                                title = isOwnProfile ? "Delete your account" : `Delete user ${user.firstName}`;
                                            }

                                            return (
                                                <div className={`delete-button-container ${isDisabled ? 'disabled' : ''}`} title={title}>
                                                    {isDisabled ? (
                                                        <button disabled>
                                                            <MdDelete />
                                                        </button>
                                                    ) : (
                                                        <OpenModalButton
                                                            buttonText={<MdDelete />}
                                                            modalComponent={
                                                                <DeleteConfirmationModal
                                                                    message={isOwnProfile ? "Are you sure you want to delete your account? This action cannot be undone." : `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`}
                                                                    onConfirm={() => handleDeleteUser(user.id)}
                                                                    confirmButtonText={isOwnProfile ? "Yes, Delete Account" : "Yes, Delete User"}
                                                                />
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <p>{searchTerm.trim() ? "No users match your search." : "No users found."}</p>
            )}

            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button onClick={goToPrevPage} disabled={currentPage === 1} className="general-button">
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
                        .map((pageNumber, index, arr) => {
                            if (pageNumber === 'ellipsis') {
                                // Prevent consecutive ellipsis
                                if (arr[index - 1] === 'ellipsis') return null;
                                return <span key={`ellipsis-${index}`} className="page-ellipsis">...</span>;
                            }
                            return (
                                <button
                                    key={pageNumber}
                                    onClick={() => paginate(pageNumber)}
                                    className={`page-number general-button ${currentPage === pageNumber ? 'active' : ''}`}
                                >
                                    {pageNumber}
                                </button>
                            );
                        })
                    }
                    <button onClick={goToNextPage} disabled={currentPage === totalPages} className="general-button">
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default GetAllUsersPage;
