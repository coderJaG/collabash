import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { MdDelete, MdPersonAdd, MdSearch } from 'react-icons/md';
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
            <div className="container loading-container">
                <div className="admin-header-section">
                    <h1 className="admin-header">All Users</h1>
                </div>
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <div className="admin-header-section">
                    <h1 className="admin-header">All Users</h1>
                </div>
                <div className="alert alert-error">
                    <p>Error fetching users: {error.message || String(error)}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="admin-header-section">
                <h1 className="admin-header">All Users</h1>
                <p className="admin-subtitle">Manage system users and permissions</p>
            </div>

            {deleteError && (
                <div className="alert alert-error">
                    <p>{deleteError}</p>
                </div>
            )}

            <div className="user-list-controls">
                {canCreateUser && (
                    <OpenModalButton
                        buttonText={
                            <>
                                <MdPersonAdd /> Create New User
                            </>
                        }
                        className="btn btn-success create-user-button"
                        modalComponent={<SignUpFormModal createdByBanker={true} />}
                    />
                )}
                
                <div className="search-container">
                    <div className="search-input-wrapper">
                        {/* <MdSearch className="search-icon" /> */}
                        <input
                            type="text"
                            placeholder=" Search users..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="search-input users-search-input"
                        />
                    </div>
                </div>
            </div>

            <div className="users-stats">
                <div className="stat-item">
                    <span className="stat-label">Total Users</span>
                    <span className="stat-value">{usersArray.length}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Filtered Results</span>
                    <span className="stat-value">{filteredUsers.length}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Current Page</span>
                    <span className="stat-value">{currentPage} of {totalPages}</span>
                </div>
            </div>

            <div className="table-container">
                {currentUsersOnPage.length > 0 ? (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Username</th>
                                <th>Mobile</th>
                                <th>Role</th>
                                <th>Pots Joined</th>
                                <th>Actions</th>
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
                                        isDeleteDisabled = hasActiveOrPausedPot;
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
                                    <tr key={user.id} className={isOwnProfile ? "current-user-row" : ""}>
                                        <td 
                                            className={canViewProfile ? "user-name-link" : ""} 
                                            onClick={canViewProfile ? () => handleUserNameClick(user) : undefined} 
                                            title={canViewProfile ? `View ${user.firstName}'s profile` : "Permission denied"}
                                        >
                                            <div className="user-info">
                                                <div className="user-avatar">
                                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                                </div>
                                                <div className="user-details">
                                                    <span className="user-name">
                                                        {user.firstName} {user.lastName}
                                                        {isOwnProfile && <span className="you-indicator"> (You)</span>}
                                                    </span>
                                                    <span className="user-email">{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="username-display">{user.username}</span>
                                        </td>
                                        <td>
                                            <span className="mobile-display">{user.mobile || 'Not provided'}</span>
                                        </td>
                                        <td>
                                            <span className={`role-badge role-${user.role}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td 
                                            title={potsJoined.map(p => p.name).join(', ')} 
                                            className={potsJoined.length > 0 ? "has-tooltip pots-cell" : "pots-cell"}
                                        >
                                            <span className="pots-count">
                                                {displayPotsText}
                                            </span>
                                        </td>
                                        <td className="action-cell">
                                            {canAttemptDelete ? (
                                                <div title={deleteButtonTitle}>
                                                    <OpenModalButton
                                                        buttonText={<MdDelete />}
                                                        className={`btn ${isDeleteDisabled ? 'btn-secondary' : 'btn-danger'} delete-user-button ${isDeleteDisabled ? 'disabled' : ''}`}
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
                                                <button 
                                                    className="btn btn-secondary delete-user-button disabled" 
                                                    title={deleteButtonTitle} 
                                                    disabled
                                                >
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
                    <div className="no-users-message">
                        <h3>No users found</h3>
                        <p>{searchTerm.trim() ? "No users match your search criteria." : "No users found in the system."}</p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button 
                        onClick={goToPrevPage} 
                        disabled={currentPage === 1}
                        className="btn btn-secondary pagination-btn"
                    >
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
                        .map((pageNumber, index) => (
                           pageNumber === 'ellipsis' ?
                           <span key={`ellipsis-${index}`} className="page-ellipsis">...</span> :
                           <button 
                               key={pageNumber} 
                               onClick={() => paginate(pageNumber)} 
                               className={`btn ${currentPage === pageNumber ? 'btn-primary' : 'btn-secondary'} page-number ${currentPage === pageNumber ? 'active' : ''}`}
                           >
                               {pageNumber}
                           </button>
                        ))
                    }
                    
                    <button 
                        onClick={goToNextPage} 
                        disabled={currentPage === totalPages}
                        className="btn btn-secondary pagination-btn"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default GetAllUsersPage;