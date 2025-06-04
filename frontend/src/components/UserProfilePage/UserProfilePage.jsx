//src/components/UserProfilePage/UserProfilePage.jsx

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { NavLink } from "react-router-dom";
import * as potsActions from "../../store/pots";
import { updateUser } from "../../store/users"; 
import * as sessionActions from "../../store/session"; 
import LoadingSpinner from "../LoadingSpinner";
import "./UserProfilePage.css";

const UserProfilePage = () => {
    const dispatch = useDispatch();
    const currUser = useSelector(state => state.session.user);
    const allPotsById = useSelector(state => state.pots.allById);
    const isLoadingPots = useSelector(state => state.pots.isLoadingList);
    const potsError = useSelector(state => state.pots.errorList);

    // State for editing
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        mobile: "",
    });
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [editError, setEditError] = useState("");
    const [editSuccess, setEditSuccess] = useState("");

    // Initialize formData when currUser changes or when editing starts
    useEffect(() => {
        if (currUser) {
            setFormData({
                firstName: currUser.firstName || "",
                lastName: currUser.lastName || "",
                username: currUser.username || "",
                email: currUser.email || "",
                mobile: currUser.mobile || "",
                // role notincluded to prevent standard user update
            });
        }
    }, [currUser]);

    useEffect(() => {
        dispatch(potsActions.getPots());
    }, [dispatch]);

    const userPotsOwned = currUser ? Object.values(allPotsById).filter(pot => pot.ownerId === currUser.id) : [];
    const userPotsJoined = currUser ? Object.values(allPotsById).filter(pot =>
        pot.Users && pot.Users.some(user => user.id === currUser.id)
    ) : [];

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        setEditError("");
        setEditSuccess("");
        if (!isEditing && currUser) {
            // Reset form data to current user details when entering edit mode
            setFormData({
                firstName: currUser.firstName || "",
                lastName: currUser.lastName || "",
                username: currUser.username || "",
                email: currUser.email || "",
                mobile: currUser.mobile || "",
            });
            setNewPassword("");
            setConfirmPassword("");
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitChanges = async (e) => {
        e.preventDefault();
        setEditError("");
        setEditSuccess("");

        if (newPassword && newPassword !== confirmPassword) {
            setEditError("New passwords do not match.");
            return;
        }
        if (newPassword && newPassword.length < 6) {
            setEditError("New password must be at least 6 characters long.");
            return;
        }

        const userDataToUpdate = { ...formData };
        if (newPassword) {
            userDataToUpdate.password = newPassword;
        }

        try {
            const updatedUser = await dispatch(updateUser(currUser.id, userDataToUpdate));
            if (updatedUser) {
                dispatch(sessionActions.restoreUser()); 
                setEditSuccess("Profile updated successfully!");
                setIsEditing(false);
                setNewPassword("");
                setConfirmPassword("");
            }
        } catch (error) {
            const errorMessage = error?.errors?.message || error?.message || "Failed to update profile. Please try again.";
            setEditError(errorMessage);
            console.error("Update profile error:", error);
        }
    };


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

    if (potsError && !isEditing) { 
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
                {editError && <p className="form-error-message">{editError}</p>}
                {editSuccess && <p className="form-success-message">{editSuccess}</p>}

                {!isEditing ? (
                    <>
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
                        <button onClick={handleEditToggle} className="user-profile-button edit-profile-button">Edit Profile</button>
                    </>
                ) : (
                    <form onSubmit={handleSubmitChanges} className="user-info-edit-form">
                        <div className="form-input-group">
                            <label htmlFor="firstName">First Name:</label>
                            <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
                        </div>
                        <div className="form-input-group">
                            <label htmlFor="lastName">Last Name:</label>
                            <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
                        </div>
                        <div className="form-input-group">
                            <label htmlFor="username">Username:</label>
                            <input type="text" id="username" name="username" value={formData.username} onChange={handleInputChange} required />
                        </div>
                        <div className="form-input-group">
                            <label htmlFor="email">Email:</label>
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} required />
                        </div>
                        <div className="form-input-group">
                            <label htmlFor="mobile">Mobile (e.g., 999-999-9999):</label>
                            <input type="tel" id="mobile" name="mobile" value={formData.mobile} onChange={handleInputChange} pattern="\d{3}-\d{3}-\d{4}" placeholder="999-999-9999" required />
                        </div>
                        <hr className="form-divider" />
                        <p className="password-change-info">Change Password (leave blank if you don't want to change it):</p>
                        <div className="form-input-group">
                            <label htmlFor="newPassword">New Password:</label>
                            <input type="password" id="newPassword" name="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        </div>
                        <div className="form-input-group">
                            <label htmlFor="confirmPassword">Confirm New Password:</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>

                        <div className="form-button-group">
                            <button type="submit" className="user-profile-button save-changes-button">Save Changes</button>
                            <button type="button" onClick={handleEditToggle} className="user-profile-button cancel-button">Cancel</button>
                        </div>
                    </form>
                )}
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
