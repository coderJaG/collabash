// GetSingleUserPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
    MdPerson, 
    MdEdit, 
    MdSave, 
    MdCancel, 
    MdEmail, 
    MdPhone, 
    MdAccountCircle, 
    MdSupervisorAccount,
    MdVisibility,
    MdVisibilityOff,
    MdArrowBack,
    MdCheck,
    MdClose
} from 'react-icons/md';
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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [editError, setEditError] = useState("");
    const [editSuccess, setEditSuccess] = useState("");
    const [focusedField, setFocusedField] = useState("");

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

    const handleMobileChange = (e) => {
        const { value } = e.target;
        const numericValue = value.replace(/[^\d]/g, '');
        const truncatedValue = numericValue.slice(0, 10);
        let formattedValue = truncatedValue;
        if (truncatedValue.length > 6) {
            formattedValue = `${truncatedValue.slice(0, 3)}-${truncatedValue.slice(3, 6)}-${truncatedValue.slice(6)}`;
        } else if (truncatedValue.length > 3) {
            formattedValue = `${truncatedValue.slice(0, 3)}-${truncatedValue.slice(3)}`;
        }
        setFormData(prev => ({ ...prev, mobile: formattedValue }));
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
                setTimeout(() => setEditSuccess(""), 3000);
            }
        } catch (error) {
            let messages = [];
            if (error.message) {
                messages.push(error.message);
            }
            if (error.errors && typeof error.errors === 'object') {
                messages = [...messages, ...Object.values(error.errors)];
            }
            
            if(messages.length === 0) {
                messages.push("Failed to update profile. Please try again.");
            }
            
            setEditError(messages.join('. '));
            setTimeout(() => setEditError(""), 5000);
        }
    };

    if (isLoading) {
        return (
            <div className="container loading-container">
                <LoadingSpinner color="#1abc9c" size={50} />
                <p className="loading-message">Loading user profile...</p>
            </div>
        );
    }

    if (error && !selectedUser?.id) {
        return (
            <div className="container">
                <div className="alert alert-error">
                    <h1>Error Loading Profile</h1>
                    <p>{error.message || 'Failed to load user details. Please try again later.'}</p>
                </div>
            </div>
        );
    }

    if (!selectedUser || Object.keys(selectedUser).length === 0) {
        return (
            <div className="container">
                <div className="alert alert-info">
                    <h1>User Profile</h1>
                    <p>User not found or data is unavailable.</p>
                </div>
            </div>
        );
    }

    const potsOwnedBySelectedUser = selectedUser.PotsOwned || [];
    const potsJoinedBySelectedUser = selectedUser.PotsJoined || [];

    const renderPotsTable = (pots, tableTitle) => {
        if (!pots || pots.length === 0) {
            return (
                <div className="no-pots-message">
                    <h3>No Pots Found</h3>
                    <p>{tableTitle === "POTS OWNED" ? 
                        `${selectedUser.firstName} does not own any pots.` : 
                        `${selectedUser.firstName} has not joined any other pots.`}
                    </p>
                </div>
            );
        }
        return (
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Pot Name</th>
                            <th>Pot Value</th>
                            <th>Total Members</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pots.map(pot => (
                            <tr key={pot.id}>
                                <td>
                                    <NavLink to={`/pots/${pot.id}`} className="pot-link">
                                        {pot.name || 'N/A'}
                                    </NavLink>
                                </td>
                                <td className="amount-cell">
                                    ${(pot.amount && !isNaN(pot.amount)) ? Number(pot.amount).toFixed(2) : '0.00'}
                                </td>
                                <td>{pot.Users ? pot.Users.length : (pot.userCount !== undefined ? pot.userCount : 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const isOwner = currUser && parseInt(currUser.id) === parseInt(selectedUser.id);

    return (
        <div className="container">
            <div className="admin-header-section">
                <div className="header-with-back">
                    <button 
                        className="btn btn-secondary back-to-admin-dashboard-button" 
                        onClick={() => window.history.back()}
                    >
                        <MdArrowBack /> Back
                    </button>
                    <div>
                        <h1 className="admin-header">
                            {`${selectedUser.firstName}'s Profile`}
                            {isOwner && <span className="owner-indicator"> (You)</span>}
                        </h1>
                        <p className="admin-subtitle">View and manage user information</p>
                    </div>
                </div>
            </div>

            {editError && (
                <div className="alert alert-error">
                    <MdClose className="alert-icon" />
                    <span>{editError}</span>
                </div>
            )}
            
            {editSuccess && (
                <div className="alert alert-success">
                    <MdCheck className="alert-icon" />
                    <span>{editSuccess}</span>
                </div>
            )}

            <div className="profile-section">
                <div className="profile-card">
                    {!isEditing ? (
                        <>
                            <div className="profile-info">
                                <div className="profile-avatar">
                                    <div className="avatar-large">
                                        {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                                    </div>
                                </div>
                                <div className="profile-details">
                                    <h3>{selectedUser.firstName} {selectedUser.lastName}</h3>
                                    <p className={`profile-role role-${selectedUser.role}`}>
                                        {selectedUser.role}
                                    </p>
                                </div>
                            </div>

                            <div className="profile-fields">
                                <div className="field-row">
                                    <label>
                                        <MdAccountCircle className="field-icon" />
                                        Username
                                    </label>
                                    <span>{selectedUser.username || 'Not available'}</span>
                                </div>
                                <div className="field-row">
                                    <label>
                                        <MdEmail className="field-icon" />
                                        Email
                                    </label>
                                    <span>{selectedUser.email || 'Not available'}</span>
                                </div>
                                <div className="field-row">
                                    <label>
                                        <MdPhone className="field-icon" />
                                        Mobile
                                    </label>
                                    <span>{selectedUser.mobile || 'Not provided'}</span>
                                </div>
                                <div className="field-row">
                                    <label>
                                        <MdSupervisorAccount className="field-icon" />
                                        Role
                                    </label>
                                    <span className={`role-badge role-${selectedUser.role}`}>
                                        {selectedUser.role}
                                    </span>
                                </div>
                            </div>

                            {canEditThisProfile && (
                                <button 
                                    onClick={handleEditToggle} 
                                    className="btn btn-primary edit-profile-button"
                                >
                                    <MdEdit /> Edit Profile
                                </button>
                            )}
                        </>
                    ) : (
                        <form onSubmit={handleSubmitChanges} className="profile-edit-form">
                            <div className="form-row">
                                <div className={`form-group ${focusedField === 'firstName' ? 'focused' : ''}`}>
                                    <label>
                                        <MdPerson className="label-icon" />
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        onFocus={() => setFocusedField('firstName')}
                                        onBlur={() => setFocusedField('')}
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div className={`form-group ${focusedField === 'lastName' ? 'focused' : ''}`}>
                                    <label>
                                        <MdPerson className="label-icon" />
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        onFocus={() => setFocusedField('lastName')}
                                        onBlur={() => setFocusedField('')}
                                        className="form-input"
                                        required
                                    />
                                </div>
                            </div>

                            <div className={`form-group ${focusedField === 'username' ? 'focused' : ''}`}>
                                <label>
                                    <MdAccountCircle className="label-icon" />
                                    Username
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    onFocus={() => setFocusedField('username')}
                                    onBlur={() => setFocusedField('')}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className={`form-group ${focusedField === 'email' ? 'focused' : ''}`}>
                                <label>
                                    <MdEmail className="label-icon" />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField('')}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className={`form-group ${focusedField === 'mobile' ? 'focused' : ''}`}>
                                <label>
                                    <MdPhone className="label-icon" />
                                    Mobile Number
                                </label>
                                <input
                                    type="tel"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleMobileChange}
                                    onFocus={() => setFocusedField('mobile')}
                                    onBlur={() => setFocusedField('')}
                                    placeholder="999-999-9999"
                                    maxLength="12"
                                    className="form-input"
                                    required
                                />
                            </div>

                            {canEditAnyUser && (
                                <div className={`form-group ${focusedField === 'role' ? 'focused' : ''}`}>
                                    <label>
                                        <MdSupervisorAccount className="label-icon" />
                                        Role
                                    </label>
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        onFocus={() => setFocusedField('role')}
                                        onBlur={() => setFocusedField('')}
                                        className="form-input"
                                    >
                                        <option value="standard">Standard</option>
                                        <option value="banker">Banker</option>
                                        <option value="superadmin">Super Admin</option>
                                    </select>
                                </div>
                            )}

                            <hr className="form-divider" />
                            <p className="password-change-info">
                                Change Password (leave blank if you do not want to change it):
                            </p>

                            <div className={`form-group password-group ${focusedField === 'newPassword' ? 'focused' : ''}`}>
                                <label>New Password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        onFocus={() => setFocusedField('newPassword')}
                                        onBlur={() => setFocusedField('')}
                                        className="form-input"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                                    </button>
                                </div>
                            </div>

                            <div className={`form-group password-group ${focusedField === 'confirmPassword' ? 'focused' : ''}`}>
                                <label>Confirm New Password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        onFocus={() => setFocusedField('confirmPassword')}
                                        onBlur={() => setFocusedField('')}
                                        className="form-input"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-success">
                                    <MdSave /> Save Changes
                                </button>
                                <button type="button" onClick={handleEditToggle} className="btn btn-secondary">
                                    <MdCancel /> Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <div className="pots-section">
                <h2 className="section-title">
                    Pots Owned by {selectedUser.firstName}
                </h2>
                {renderPotsTable(potsOwnedBySelectedUser, "POTS OWNED")}
            </div>

            <div className="pots-section">
                <h2 className="section-title">
                    Pots Joined by {selectedUser.firstName}
                </h2>
                {renderPotsTable(potsJoinedBySelectedUser, "POTS JOINED")}
            </div>
        </div>
    );
};

export default GetSingleUserPage;