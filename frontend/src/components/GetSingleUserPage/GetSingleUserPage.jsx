import { useState, useEffect, useMemo } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import * as userActions from '../../store/users';
import * as sessionActions from '../../store/session';
import LoadingSpinner from '../LoadingSpinner';
import './GetSingleUserPage.css';

const GetSingleUserPage = () => {
    const { userId: viewedUserId } = useParams();
    const dispatch = useDispatch();

    const selectedUser = useSelector((state) => state.users.userById);
    const isLoading = useSelector((state) => state.users.isLoadingUserDetails);
    const error = useSelector((state) => state.users.errorUserDetails);
    const currUser = useSelector(state => state.session.user);

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        mobile: "",
        role: "",
    });
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [editError, setEditError] = useState("");
    const [editSuccess, setEditSuccess] = useState("");

    // Check for permissions from the user object
    const userPermissions = useMemo(() => new Set(currUser?.permissions || []), [currUser]);
    const canEditAnyUser = userPermissions.has('user:edit_any');
    const canEditThisProfile = useMemo(() => {
        if (!currUser || !selectedUser) return false;
        const isOwner = parseInt(currUser.id) === parseInt(selectedUser.id);
        return isOwner || canEditAnyUser;
    }, [currUser, selectedUser, canEditAnyUser]);


    useEffect(() => {
        if (viewedUserId) {
            dispatch(userActions.getUserById(viewedUserId));
        }
        return () => {
            dispatch(userActions.clearCurrentUserDetails());
        };
    }, [dispatch, viewedUserId]);

    useEffect(() => {
        if (selectedUser && Object.keys(selectedUser).length > 0) {
            setFormData({
                firstName: selectedUser.firstName || "",
                lastName: selectedUser.lastName || "",
                username: selectedUser.username || "",
                email: selectedUser.email || "",
                mobile: selectedUser.mobile || "",
                role: selectedUser.role || "standard",
            });
        }
    }, [selectedUser]);


    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        setEditError("");
        setEditSuccess("");
        if (!isEditing && selectedUser) {
            setFormData({
                firstName: selectedUser.firstName || "",
                lastName: selectedUser.lastName || "",
                username: selectedUser.username || "",
                email: selectedUser.email || "",
                mobile: selectedUser.mobile || "",
                role: selectedUser.role || "standard",
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

        const userDataToUpdate = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            username: formData.username,
            email: formData.email,
            mobile: formData.mobile,
        };
        
      
        if (canEditAnyUser) {
            userDataToUpdate.role = formData.role;
        }

        if (newPassword) {
            userDataToUpdate.password = newPassword;
        }

        try {
            const updatedUserResponse = await dispatch(userActions.updateUser(selectedUser.id, userDataToUpdate));
            if (updatedUserResponse) {
                setEditSuccess("Profile updated successfully!");
                setIsEditing(false);
                setNewPassword("");
                setConfirmPassword("");
                if (currUser && parseInt(currUser.id) === parseInt(selectedUser.id)) {
                    dispatch(sessionActions.restoreUser()); 
                }
                dispatch(userActions.getUserById(viewedUserId));
            }
        } catch (error) {
            const errorMessage = error?.errors?.message || error?.message || "Failed to update profile. Please try again.";
            setEditError(errorMessage);
        }
    };

    if (isLoading) {
        return <LoadingSpinner message="Loading user profile..." />;
    }

    if (error && !selectedUser?.id) {
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
                                <td><NavLink to={`/pots/${pot.id}`} className="pot-link-on-profile">{pot.name || 'N/A'}</NavLink></td>
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
            <div className="single-user-page-header"><h1>{`${selectedUser.firstName?.toUpperCase()}'S`} PROFILE</h1></div>

            <div className="single-user-info-card">
                {editError && <p className="form-error-message">{editError}</p>}
                {editSuccess && <p className="form-success-message">{editSuccess}</p>}
                {error && selectedUser?.id && <p className="form-error-message">{error.message}</p>}

                {!isEditing ? (
                    <>
                        <div className="single-user-detail-row"><p><strong>Name:</strong> {selectedUser.firstName} {selectedUser.lastName}</p></div>
                        <div className="single-user-detail-row"><p><strong>Username:</strong> {selectedUser.username || '(Not available)'}</p></div>
                        <div className="single-user-detail-row"><p><strong>Email:</strong> {selectedUser.email || '(Not available)'}</p></div>
                        <div className="single-user-detail-row"><p><strong>Mobile:</strong> {selectedUser.mobile || 'N/A'}</p></div>
                        <div className="single-user-detail-row"><p><strong>Role:</strong> {selectedUser.role}</p></div>
                        {canEditThisProfile && (
                            <button onClick={handleEditToggle} className="user-profile-button edit-profile-button">Edit Profile</button>
                        )}
                    </>
                ) : (
                    <form onSubmit={handleSubmitChanges} className="user-info-edit-form">
                        <div className="form-input-group"><label htmlFor="firstName">First Name:</label><input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required /></div>
                        <div className="form-input-group"><label htmlFor="lastName">Last Name:</label><input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required /></div>
                        <div className="form-input-group"><label htmlFor="username">Username:</label><input type="text" id="username" name="username" value={formData.username} onChange={handleInputChange} required /></div>
                        <div className="form-input-group"><label htmlFor="email">Email:</label><input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} required /></div>
                        <div className="form-input-group"><label htmlFor="mobile">Mobile (e.g., 999-999-9999):</label><input type="tel" id="mobile" name="mobile" value={formData.mobile} onChange={handleInputChange} pattern="\d{3}-\d{3}-\d{4}" placeholder="999-999-9999" required /></div>
                        
                       
                        {canEditAnyUser ? (
                            <div className="form-input-group">
                                <label htmlFor="role">Role:</label>
                                <select id="role" name="role" value={formData.role} onChange={handleInputChange}>
                                    <option value="standard">Standard</option>
                                    <option value="banker">Banker</option>
                                    <option value="super admin">Super Admin</option>
                                </select>
                            </div>
                        ) : (
                             <div className="single-user-detail-row"><p><strong>Role:</strong> {selectedUser.role}</p></div>
                        )}

                        <hr className="form-divider" />
                        <p className="password-change-info">Change Password (leave blank if you do not want to change it):</p>
                        <div className="form-input-group"><label htmlFor="newPassword">New Password:</label><input type="password" id="newPassword" name="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" /></div>
                        <div className="form-input-group"><label htmlFor="confirmPassword">Confirm New Password:</label><input type="password" id="confirmPassword" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password"/></div>

                        <div className="form-button-group">
                            <button type="submit" className="user-profile-button save-changes-button">Save Changes</button>
                            <button type="button" onClick={handleEditToggle} className="user-profile-button cancel-button">Cancel</button>
                        </div>
                    </form>
                )}
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
