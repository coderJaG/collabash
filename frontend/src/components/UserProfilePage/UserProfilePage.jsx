//src/components/UserProfilePage/UserProfilePage.jsx

import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { NavLink } from "react-router-dom"; 
import * as potsActions from "../../store/pots";
import LoadingSpinner from "../LoadingSpinner";
import "./UserProfilePage.css";





const UserProfilePage = () => {
    const dispatch = useDispatch();
    const currUser = useSelector(state => state.session.user);
    const allPotsById = useSelector(state => state.pots.allById);
    const isLoadingPots = useSelector(state => state.pots.isLoadingList);
    const potsError = useSelector(state => state.pots.errorList);

    useEffect(() => {
        dispatch(potsActions.getPots());
    }, [dispatch]);

    
    const userPotsOwned = currUser ? Object.values(allPotsById).filter(pot => pot.ownerId === currUser.id) : [];

    const userPotsJoined = currUser ? Object.values(allPotsById).filter(pot =>
        // pot.ownerId !== currUser.id && //currently pot owners can join their own pots. may change this later
        pot.Users && pot.Users.some(user => user.id === currUser.id)
    ) : [];

    if (!currUser) {
        return (
            <div className="user-page-wrapper">
                <p>Please log in to view your profile.</p>
            </div>
        );
    }

    if (isLoadingPots && userPotsOwned.length === 0 && userPotsJoined.length === 0) {
        return <LoadingSpinner message="Loading profile data..." />;
    }

    if (potsError) {
        return (
            <div className="user-page-wrapper error-container">
                <p>Error loading pot data: {potsError.message || String(potsError)}</p>
            </div>
        );
    }

    const renderPotsTable = (pots, tableTitle) => {
        if (!pots || pots.length === 0) {
            return (
                <div className="no-pots-message">
                    <p>{tableTitle === "POTS YOU OWN" ? "You do not own any pots." : "You have not joined any pots."}</p>
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
                                <td>{pot.Users ? pot.Users.length : 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="user-page-wrapper">
            <div className="user-page-header"><h1>PROFILE PAGE</h1></div>
            <div className="user-info-card">
                <div className="user-detail-row">
                    <p><strong>Name:</strong> {currUser.firstName} {currUser.lastName}</p>
                </div>
                <div className="user-detail-row">
                    <p><strong>Username:</strong> {currUser.username || '(Not available)'}</p>
                </div>
                <div className="user-detail-row">
                    <p><strong>Email:</strong> {currUser.email || '(Not available)'}</p>
                </div>
                <div className="user-detail-row">
                    <p><strong>Mobile:</strong> {currUser.mobile || 'N/A'}</p>
                </div>
                <div className="user-detail-row">
                    <p><strong>Role:</strong> {currUser.role}</p>
                </div>
            </div>

            <div className="user-pots-list">
                <h2>POTS YOU OWN</h2>
                {renderPotsTable(userPotsOwned, "POTS YOU OWN")}
            </div>

            <div className="user-pots-list">
                <h2>POTS YOU JOINED</h2>
                {renderPotsTable(userPotsJoined, "POTS YOU JOINED")}
            </div>
        </div>
    );
};

export default UserProfilePage;
