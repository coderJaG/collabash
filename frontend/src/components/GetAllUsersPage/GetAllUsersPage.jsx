// src/components/GetAllUsersPage/GetAllUsersPage.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
// import { NavLink } from 'react-router-dom';
import * as usersActions from '../../store/users';
import LoadingSpinner from '../LoadingSpinner';
import OpenModalButton from '../OpenModalButton';
import SignUpFormModal from '../SignUpFormModal';
import './GetAllUsersPage.css'; 



const GetAllUsersPage = () => { 
    const dispatch = useDispatch();
    const allUsersObject = useSelector(state => state.users.allUsers); // This is the object { id1: user1, ... }
    const isLoading = useSelector(state => state.users.isLoadingAllUsers);
    const error = useSelector(state => state.users.errorAllUsers);
    const currUser = useSelector(state => state.session.user);

    useEffect(() => {
        dispatch(usersActions.getAllUsers());
    }, [dispatch]);

    // Convert the object of users into an array for mapping
    // The backend already filters by role, so this list is what the current user is allowed to see.
    const usersArray = allUsersObject ? Object.values(allUsersObject) : [];


    if (isLoading) {
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

    if (!usersArray.length && !isLoading) { // Check usersArray.length
        return (
            <div className="user-list-page-container"> {/* Use a consistent class name */}
                <h1>All Users</h1>
                <p>No users found or you may not have permission to view them.</p>
            </div>
        );
    }

    return (
        <div className="user-list-page-container"> {/* Use a consistent class name */}
            <h1>All Users</h1>
            {currUser?.role === 'banker' && (
                //  <NavLink to="/users/create" className="create-user-button">Create New User</NavLink>
                <OpenModalButton
                buttonText="Create New User"
                modalComponent={<SignUpFormModal createdByBanker={true} />}
                />
            )}
            <table className="users-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>Role</th>
                    </tr>
                </thead>
                <tbody>
                    {usersArray.map(user => ( // Map over usersArray
                        <tr key={user.id}>
                            <td>{user.firstName} {user.lastName}</td>
                            <td>{user.mobile}</td>
                            <td>{user.role}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default GetAllUsersPage;
