'use strict';

// Define Roles
const ROLES = {
  STANDARD: 'standard',
  BANKER: 'banker',
  SUPER_ADMIN: 'super admin'
};

// Define Permissions - These are the granular actions users can perform.
const PERMISSIONS = {
  // Pot Management
  VIEW_ALL_POTS: 'pot:view_all',
  VIEW_OWNED_POTS: 'pot:view_owned',
  CREATE_POT: 'pot:create',
  EDIT_POT: 'pot:edit',
  DELETE_POT: 'pot:delete',
  MANAGE_POT_MEMBERS: 'pot:manage_members', // Covers add, remove, reorder

  // User Management
  VIEW_ALL_USERS: 'user:view_all',
  CREATE_USER: 'user:create', // A banker creating a user
  EDIT_ANY_USER: 'user:edit_any',
  DELETE_ANY_USER: 'user:delete_any',
  DELETE_OWN_ACCOUNT: 'user:delete_self',

  // Request Management
  CREATE_JOIN_REQUEST: 'request:create',
  RESPOND_TO_JOIN_REQUEST: 'request:respond',
  
  // History Management
  VIEW_TRANSACTION_HISTORY: 'history:view_all'
};

// Individually permission sets to avoid initialization errors.
const standardPermissions = [
  PERMISSIONS.CREATE_JOIN_REQUEST,
  PERMISSIONS.DELETE_OWN_ACCOUNT,
];

const bankerPermissions = [
  ...standardPermissions, // Inherit standard permissions
  PERMISSIONS.VIEW_ALL_POTS,
  PERMISSIONS.VIEW_ALL_USERS,
  PERMISSIONS.CREATE_POT,
  PERMISSIONS.EDIT_POT,
  PERMISSIONS.DELETE_POT,
  PERMISSIONS.MANAGE_POT_MEMBERS,
  PERMISSIONS.RESPOND_TO_JOIN_REQUEST,
  PERMISSIONS.CREATE_USER,
  PERMISSIONS.EDIT_ANY_USER,
  PERMISSIONS.VIEW_TRANSACTION_HISTORY //
];

const superAdminPermissions = [
  ...bankerPermissions, // Inherit banker permissions
  PERMISSIONS.DELETE_ANY_USER,
];


// Assign permissions to roles in a hierarchy
const ROLE_PERMISSIONS = {
  [ROLES.STANDARD]: standardPermissions,
  [ROLES.BANKER]: bankerPermissions,
  [ROLES.SUPER_ADMIN]: superAdminPermissions,
};

/**
 * Checks if a user's role has a specific permission.
 * @param {string} role The user's role.
 * @param {string} permission The permission to check for.
 * @returns {boolean}
 */
const hasPermission = (role, permission) => {
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
};


module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission
};
