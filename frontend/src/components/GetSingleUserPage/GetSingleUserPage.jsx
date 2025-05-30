import { useParams, NavLink } from 'react-router-dom'; 
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import * as userActions from '../../store/users';
import LoadingSpinner from '../LoadingSpinner';

import './GetSingleUserPage.css'; 

const GetSingleUserPage = () => {
    const { userId } = useParams();
    const dispatch = useDispatch();

    const selectedUser = useSelector((state) => state.users.userById);
    const isLoading = useSelector((state) => state.users.isLoadingUserDetails);
    const error = useSelector((state) => state.users.errorUserDetails);
    // const currUser = useSelector(state => state.session.user); // if auth checks is needed in the future

    useEffect(() => {
        if (userId) {
            dispatch(userActions.getUserById(userId));
        }
        return () => {
            // Clear the specific user details when the component unmounts
            // or when userId changes to prevent showing stale data.
            dispatch(userActions.clearCurrentUserDetails());
        };
    }, [dispatch, userId]);

    if (isLoading) {
        return <LoadingSpinner message="Loading user profile..." />;
    }

    if (error) {
        return (
            <div className="single-user-page-wrapper error-container"> 
                <h1>Error Loading Profile</h1>
                <p>{error.message || 'Failed to load user details. Please try again later.'}</p>
            </div>
        );
    }

    if (!selectedUser || Object.keys(selectedUser).length === 0) {
        return (
            <div className="single-user-page-wrapper">
                <h1>User Profile</h1>
                <p>User not found or data is unavailable.</p>
            </div>
        );
    }

    const potsOwnedBySelectedUser = selectedUser.PotsOwned || []; 
    const potsJoinedBySelectedUser = selectedUser.PotsJoined || [];

    const renderPotsTable = (pots, tableTitle) => {
        if (!pots || pots.length === 0) {
            return (
                <div className="no-pots-message">
                    <p>{tableTitle === "POTS OWNED" ? `${selectedUser.firstName} does not own any pots.` : `${selectedUser.firstName} has not joined any other pots.`}</p>
                </div>
            );
        }
        return (
            <div className="pot-item"> 
                <table>
                    <thead>
                        <tr>
                            <th>POT NAME</th>
                            <th>POT VALUE</th>
                            <th>TOTAL MEMBERS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pots.map(pot => (
                            <tr key={pot.id}>
                                <td>
                                    <NavLink to={`/pots/${pot.id}`} className="pot-link-on-profile">
                                        {pot.name || 'N/A'}
                                    </NavLink>
                                </td>
                                <td>${(pot.amount && !isNaN(pot.amount)) ? Number(pot.amount).toFixed(2) : '0.00'}</td>
                                <td>{pot.Users ? pot.Users.length : (pot.userCount !== undefined ? pot.userCount : 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="single-user-page-wrapper"> 
            <div className="single-user-page-header"><h1>{selectedUser.firstName?.toUpperCase()}'S PROFILE</h1></div>
            <div className="single-user-info-card"> 
                <div className="single-user-detail-row">
                    <p><strong>Name:</strong> {selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
                <div className="single-user-detail-row">
                    <p><strong>Username:</strong> {selectedUser.username || '(Not available)'}</p>
                </div>
                <div className="single-user-detail-row">
                    <p><strong>Email:</strong> {selectedUser.email || '(Not available)'}</p>
                </div>
                <div className="single-user-detail-row">
                    <p><strong>Mobile:</strong> {selectedUser.mobile || 'N/A'}</p>
                </div>
                <div className="single-user-detail-row">
                    <p><strong>Role:</strong> {selectedUser.role}</p>
                </div>
            </div>

            <div className="single-user-pots-list"> 
                <h2>POTS OWNED BY {selectedUser.firstName?.toUpperCase()}</h2>
                {renderPotsTable(potsOwnedBySelectedUser, "POTS OWNED")}
            </div>

            <div className="single-user-pots-list"> 
                <h2>POTS JOINED BY {selectedUser.firstName?.toUpperCase()}</h2>
                {renderPotsTable(potsJoinedBySelectedUser, "POTS JOINED")}
            </div>
        </div>
    );
};

export default GetSingleUserPage;
