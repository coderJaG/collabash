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

const USERS_PER_PAGE = 20;

const GetAllUsersPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const allUsersObject = useSelector(state => state.users.allUsers);
    const isLoading = useSelector(state => state.users.isLoadingAllUsers);
    const error = useSelector(state => state.users.errorAllUsers);
    const currUser = useSelector(state => state.session.user);
    

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteError, setDeleteError] = useState(null);

    const userPermissions = useMemo(() => new Set(currUser?.permissions || []), [currUser]);
    const canCreateUser = userPermissions.has('user:create');
    const canViewAllUsers = userPermissions.has('user:view_all');
    // const canDeleteAnyUser = userPermissions.has('user:delete_any');
    const canDeleteSelf = userPermissions.has('user:delete_self');
    

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
        if (canViewAllUsers || currUser.id === targetUser.id) {
            navigate(`/users/${targetUser.id}`);
        }
    };

     const handleDeleteUser = async (userIdToDelete) => {
        setDeleteError(null);
        try {
            await dispatch(usersActions.deleteUserById(userIdToDelete));
            if (currUser && currUser.id === userIdToDelete) {
                dispatch(sessionActions.logout());
                navigate('/');
            }
            if (currentUsersOnPage.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            }
        } catch (err) {
            setDeleteError(err.message || "An unexpected error occurred while deleting the user.");
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
            {deleteError && <p className="error-message general-error">{deleteError}</p>}
            <div className="user-list-controls">
                {canCreateUser && (
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

            <div className="users-table-container">
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
                                const isOwnProfile = currUser?.id === user.id;

                           
                                let canAttemptDelete = false;
                                let isDeleteDisabled = true;
                                let deleteButtonTitle = "";

                                const hasActiveOrPausedPot = potsJoined.some(p => ['active', 'paused'].includes(p.status?.toLowerCase()));

                                if (isOwnProfile && canDeleteSelf && user.role === 'standard') {
                                    canAttemptDelete = true;
                                    isDeleteDisabled = hasActiveOrPausedPot;
                                    deleteButtonTitle = isDeleteDisabled ? "Cannot delete: You are in an active or paused pot." : "Delete your account";
                                } 
                                else if (!isOwnProfile) {
                                    if (currUser.role === 'superadmin' && user.role !== 'superadmin') {
                                        canAttemptDelete = true;
                                        isDeleteDisabled = hasActiveOrPausedPot;
                                        deleteButtonTitle = isDeleteDisabled ? `Cannot delete: ${user.firstName} is in an active or paused pot.` : `Delete user ${user.firstName}`;
                                    } else if (currUser.role === 'banker' && user.role === 'standard') {
                                        canAttemptDelete = true;
                                        isDeleteDisabled = hasActiveOrPausedPot; // A banker can always delete a standard user (backend will check pot association)
                                        deleteButtonTitle = `Delete user ${user.firstName}`;
                                    } else {
                                        deleteButtonTitle = "You do not have permission to delete this user.";
                                    }
                                }
                                
                                const canViewProfile = canViewAllUsers || isOwnProfile;
                                let displayPotsText = "None";
                                if (potsJoined.length > 0) {
                                    displayPotsText = potsJoined[0].name;
                                    if (potsJoined.length > 1) {
                                        displayPotsText += ` (+${potsJoined.length - 1} more)`;
                                    }
                                }

                                return (
                                    <tr key={user.id}>
                                        <td className={canViewProfile ? "user-name-link" : ""} onClick={canViewProfile ? () => handleUserNameClick(user) : undefined} title={canViewProfile ? `View ${user.firstName}'s profile` : "Permission denied"}>
                                            {user.firstName} {user.lastName}
                                        </td>
                                        <td>{user.mobile}</td>
                                        <td>{user.role}</td>
                                        <td title={potsJoined.map(p => p.name).join(', ')} className={potsJoined.length > 0 ? "has-tooltip" : ""}>
                                            {displayPotsText}
                                        </td>
                                        <td className="actions-cell">
                                            {canAttemptDelete ? (
                                                <div title={deleteButtonTitle}>
                                                    <OpenModalButton
                                                        buttonText={<MdDelete />}
                                                        className={`delete-user-button ${isDeleteDisabled ? 'disabled' : ''}`}
                                                        disabled={isDeleteDisabled}
                                                        modalComponent={
                                                            <DeleteConfirmationModal
                                                                message={`Are you sure you want to delete ${user.firstName} ${user.lastName}?`}
                                                                onConfirm={() => handleDeleteUser(user.id)}
                                                                confirmButtonText="Yes, Delete User"
                                                            />
                                                        }
                                                    />
                                                </div>
                                            ) : (
                                                <button className="delete-user-button disabled" title={deleteButtonTitle} disabled>
                                                    <MdDelete />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <p>{searchTerm.trim() ? "No users match your search." : "No users found."}</p>
                )}
            </div>

            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button onClick={goToPrevPage} disabled={currentPage === 1}>Previous</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(pageNumber => {
                            if (totalPages <= 7) return true;
                            if (pageNumber === 1 || pageNumber === totalPages) return true;
                            if (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2) return true;
                            if ((pageNumber === currentPage - 3 && currentPage > 4) || (pageNumber === currentPage + 3 && currentPage < totalPages - 3)) return 'ellipsis';
                            return false;
                        })
                        .map((pageNumber, index) => (
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

export default GetAllUsersPage;
