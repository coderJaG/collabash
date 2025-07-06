import { useState, useMemo, useEffect, useRef } from "react";
import { useModal } from '../context/Modal';
import { MdSearch, MdClose, MdCheckBox, MdCheckBoxOutlineBlank, MdFilterList, MdSort } from 'react-icons/md';
import './AddUserToPot.css'

const AddUsersToPot = ({
    currentPotUsers,
    onSave,
    availableUsers,
    isSavingUsers
}) => {
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('name'); // 'name', 'email', 'mobile'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const searchInputRef = useRef(null);
    const sortDropdownRef = useRef(null);

    const { closeModal } = useModal();

    // Focus search input on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            searchInputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Track unsaved changes
    useEffect(() => {
        setHasUnsavedChanges(selectedUserIds.size > 0);
    }, [selectedUserIds]);

    // Close sort dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
                setShowSortDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Enhanced search and sorting logic
    const usersToDisplay = useMemo(() => {
        const availableUsersArray = Array.isArray(availableUsers) ? availableUsers : [];

        // Filter out users already in the pot
        let filteredUsers = availableUsersArray.filter(newUser => {
            return !currentPotUsers.some(potUser => potUser.id === newUser.id);
        });

        // Apply search filter with improved full name search
        if (searchTerm.trim()) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filteredUsers = filteredUsers.filter(user =>
                `${user.firstName} ${user.lastName}`.toLowerCase().includes(lowerSearchTerm) ||
                user.email?.toLowerCase().includes(lowerSearchTerm) ||
                user.mobile?.toLowerCase().includes(lowerSearchTerm) ||
                user.username?.toLowerCase().includes(lowerSearchTerm)
            );
        }

        // Apply sorting
        filteredUsers.sort((a, b) => {
            let compareValue = 0;

            switch (sortBy) {
                case 'name': {
                    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                    compareValue = nameA.localeCompare(nameB);
                    break;
                }
                case 'email':
                    compareValue = (a.email || '').toLowerCase().localeCompare((b.email || '').toLowerCase());
                    break;
                case 'mobile':
                    compareValue = (a.mobile || '').localeCompare((b.mobile || ''));
                    break;
                default:
                    compareValue = 0;
            }

            return sortOrder === 'asc' ? compareValue : -compareValue;
        });

        return filteredUsers;
    }, [availableUsers, currentPotUsers, searchTerm, sortBy, sortOrder]);

    const handleUserToggle = (userId) => {
        const newSelectedUserIds = new Set(selectedUserIds);
        if (newSelectedUserIds.has(userId)) {
            newSelectedUserIds.delete(userId);
        } else {
            newSelectedUserIds.add(userId);
        }
        setSelectedUserIds(newSelectedUserIds);
        setError(null);
    };

    const handleSelectAll = () => {
        if (selectedUserIds.size === usersToDisplay.length) {
            // Deselect all
            setSelectedUserIds(new Set());
        } else {
            // Select all visible users (respects search filter)
            setSelectedUserIds(new Set(usersToDisplay.map(user => user.id)));
        }
        setError(null);
    };

    const handleSaveChanges = async () => {
        if (selectedUserIds.size === 0) {
            setError('Please select at least one user');
            return;
        }

        try {
            // Convert Set to Array for the onSave function
            const selectedUsersArray = Array.from(selectedUserIds);
            await onSave(selectedUsersArray);
            setHasUnsavedChanges(false);
            closeModal();
        } catch (saveError) {
            console.error("Error saving users from modal:", saveError);
            setError("Failed to add users. Please try again.");
        }
    };

    const handleCancel = () => {
        if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure you want to close?')) {
            return;
        }
        closeModal();
        setError(null);
        setSelectedUserIds(new Set());
        setSearchTerm('');
        setHasUnsavedChanges(false);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setError(null);
    };

    const clearSearch = () => {
        setSearchTerm('');
        searchInputRef.current?.focus();
    };

    const handleSortChange = (newSortBy) => {
        if (sortBy === newSortBy) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortOrder('asc');
        }
        setShowSortDropdown(false);
    };

    // Quick filter functions
    const handleQuickFilter = (filterType) => {
        switch (filterType) {
            case 'hasEmail': {
                const usersWithEmail = usersToDisplay.filter(user => user.email);
                setSelectedUserIds(new Set(usersWithEmail.map(user => user.id)));
                break;
            }
            case 'hasMobile': {
                const usersWithMobile = usersToDisplay.filter(user => user.mobile);
                setSelectedUserIds(new Set(usersWithMobile.map(user => user.id)));
                break;
            }
            case 'recent': {
                const recentUsers = usersToDisplay.slice(0, Math.min(10, usersToDisplay.length));
                setSelectedUserIds(new Set(recentUsers.map(user => user.id)));
                break;
            }
            default:
                break;
        }
        setError(null);
    };

    // Keyboard shortcuts
    const handleKeyDown = (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'a':
                    e.preventDefault();
                    handleSelectAll();
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedUserIds.size > 0) {
                        handleSaveChanges();
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    handleCancel();
                    break;
            }
        }
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedUserIds, handleSelectAll, handleSaveChanges, handleCancel]);

    const isAllSelected = usersToDisplay.length > 0 && selectedUserIds.size === usersToDisplay.length;
    const isSomeSelected = selectedUserIds.size > 0 && selectedUserIds.size < usersToDisplay.length;
    const totalAvailableUsers = Array.isArray(availableUsers) ? availableUsers.filter(user =>
        !currentPotUsers.some(potUser => potUser.id === user.id)
    ).length : 0;

    const getSortIcon = () => {
        return sortOrder === 'asc' ? '↑' : '↓';
    };

    return (
        <div className="add-user-to-pot-content">
            <div className="modal-header">
                <h1>ADD USERS</h1>
                <button className="add-user-to-pot-close-button" onClick={handleCancel} disabled={isSavingUsers}>
                    <MdClose />
                </button>
            </div>

            {/* Enhanced Search and Filter Section */}
            <div className="search-section">
                <div className="search-input-container">
                    <MdSearch className="search-icon" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search by name, email, mobile, or username..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="search-input"
                        disabled={isSavingUsers}
                    />
                    {searchTerm && (
                        <button className="clear-search" onClick={clearSearch} disabled={isSavingUsers}>
                            <MdClose />
                        </button>
                    )}
                </div>

                {/* Filter and Sort Controls */}
                <div className="filter-controls">
                    <div className="quick-filters">
                        <span className="filter-label">Quick select:</span>
                        <button
                            className="quick-filter-btn"
                            onClick={() => handleQuickFilter('hasEmail')}
                            disabled={isSavingUsers}
                            title="Select users with email"
                        >
                            📧 With Email
                        </button>
                        <button
                            className="quick-filter-btn"
                            onClick={() => handleQuickFilter('hasMobile')}
                            disabled={isSavingUsers}
                            title="Select users with mobile"
                        >
                            📱 With Mobile
                        </button>
                    </div>

                    <div className="sort-controls" ref={sortDropdownRef}>
                        <button
                            className="sort-button"
                            onClick={() => setShowSortDropdown(!showSortDropdown)}
                            disabled={isSavingUsers}
                        >
                            <MdSort />
                            Sort by {sortBy} {getSortIcon()}
                        </button>
                        {showSortDropdown && (
                            <div className="sort-dropdown">
                                <button onClick={() => handleSortChange('name')}>
                                    Name {sortBy === 'name' && getSortIcon()}
                                </button>
                                <button onClick={() => handleSortChange('email')}>
                                    Email {sortBy === 'email' && getSortIcon()}
                                </button>
                                <button onClick={() => handleSortChange('mobile')}>
                                    Mobile {sortBy === 'mobile' && getSortIcon()}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Users List Section */}
            <div className="users-section">
                {usersToDisplay.length > 0 && (
                    <div className="select-all-section">
                        <button
                            className="select-all-button"
                            onClick={handleSelectAll}
                            disabled={isSavingUsers}
                        >
                            {isAllSelected ? (
                                <MdCheckBox className="checkbox-icon checked" />
                            ) : isSomeSelected ? (
                                <MdCheckBox className="checkbox-icon indeterminate" />
                            ) : (
                                <MdCheckBoxOutlineBlank className="checkbox-icon" />
                            )}
                            <span>
                                {isAllSelected ? 'Deselect All' : 'Select All'}
                                {searchTerm ? ` (${usersToDisplay.length} shown)` : ` (${totalAvailableUsers} available)`}
                            </span>
                        </button>
                        {selectedUserIds.size > 0 && (
                            <div className="selection-info">
                                <span className="selection-count">
                                    {selectedUserIds.size} selected
                                </span>
                                <button
                                    className="clear-selection"
                                    onClick={() => setSelectedUserIds(new Set())}
                                    disabled={isSavingUsers}
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="users-list">
                    {usersToDisplay.length > 0 ? (
                        usersToDisplay.map(user => {
                            const isSelected = selectedUserIds.has(user.id);
                            return (
                                <div
                                    key={user.id}
                                    className={`user-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => !isSavingUsers && handleUserToggle(user.id)}
                                >
                                    <div className="user-checkbox">
                                        {isSelected ? (
                                            <MdCheckBox className="checkbox-icon checked" />
                                        ) : (
                                            <MdCheckBoxOutlineBlank className="checkbox-icon" />
                                        )}
                                    </div>
                                    <div className="user-info">
                                        <div className="user-name">
                                            {user.firstName} {user.lastName}
                                            {user.username && (
                                                <span className="username">@{user.username}</span>
                                            )}
                                        </div>
                                        <div className="user-details">
                                            {user.email && <span className="user-email">{user.email}</span>}
                                            {user.mobile && <span className="user-mobile">{user.mobile}</span>}
                                        </div>
                                    </div>
                                    <div className="user-actions">
                                        <span className="select-hint">Click to {isSelected ? 'deselect' : 'select'}</span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-users-message">
                            {searchTerm ? (
                                <>
                                    <MdSearch size={48} />
                                    <h3>No users found</h3>
                                    <p>{`No users match your search "${searchTerm}"`}</p>
                                    <button className="clear-search-button" onClick={clearSearch}>
                                        Clear Search
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h3>No users available</h3>
                                    <p>All available users are already in this pot</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <span>{error}</span>
                </div>
            )}

            <div className="modal-actions">
                <div className="keyboard-shortcuts">
                    <span>💡 Ctrl+A: Select all • Ctrl+Enter: Save • Esc: Cancel</span>
                </div>
                <div className="action-buttons">
                    <button
                        onClick={handleCancel}
                        className="modal-button cancel"
                        disabled={isSavingUsers}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveChanges}
                        className="modal-button save"
                        disabled={isSavingUsers || selectedUserIds.size === 0}
                    >
                        {isSavingUsers ? (
                            <>
                                <div className="loading-spinner"></div>
                                Adding Users...
                            </>
                        ) : (
                            `Add ${selectedUserIds.size} User${selectedUserIds.size !== 1 ? 's' : ''}`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddUsersToPot;