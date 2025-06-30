'use strict';

// Define Roles
const ROLES = {
  STANDARD: 'standard',
  BANKER: 'banker',
  SUPER_ADMIN: 'superadmin'
};

// Define Permissions - These are the granular actions users can perform.
const PERMISSIONS = {
  // Pot Management
  VIEW_ALL_POTS: 'pot:view_all',
  VIEW_OWNED_POTS: 'pot:view_owned',
  VIEW_JOINED_POTS: 'pot:view_joined',
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
  VIEW_TRANSACTION_HISTORY: 'history:view_all',

  // Admin Specific
  VIEW_ADMIN_REPORTS: 'admin:view_reports',
  MANAGE_BANKER_STATUS: 'admin:manage_banker_status',
};

// Define permission sets for each role individually.
const standardPermissions = [
  PERMISSIONS.CREATE_JOIN_REQUEST,
  PERMISSIONS.DELETE_OWN_ACCOUNT,
];

const bankerPermissions = [
  PERMISSIONS.CREATE_JOIN_REQUEST,
  PERMISSIONS.VIEW_ALL_POTS,
  PERMISSIONS.VIEW_ALL_USERS,
  PERMISSIONS.CREATE_POT,
  PERMISSIONS.EDIT_POT,
  PERMISSIONS.DELETE_POT,
  PERMISSIONS.MANAGE_POT_MEMBERS,
  PERMISSIONS.RESPOND_TO_JOIN_REQUEST,
  PERMISSIONS.CREATE_USER,
  PERMISSIONS.EDIT_ANY_USER,
  PERMISSIONS.VIEW_TRANSACTION_HISTORY,
  PERMISSIONS.DELETE_ANY_USER
];

const superAdminPermissions = [
  ...bankerPermissions,
  PERMISSIONS.VIEW_ADMIN_REPORTS,
  PERMISSIONS.MANAGE_BANKER_STATUS
  // Any super-admin-only permissions would be added here.
  // They already inherit DELETE_ANY_USER from the banker role.
];


// Assign permissions to roles in the final hierarchy
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
