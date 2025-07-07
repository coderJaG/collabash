// backend/utils/historyLogger.js
const { TransactionHistory } = require('../db/models');

/**
 * Enhanced history logger that creates user-friendly descriptions
 * @param {object} options
 * @param {number} options.userId - ID of the user performing the action
 * @param {string} options.actionType - Type of action (e.g., 'CREATE_POT')
 * @param {string} [options.entityType] - Type of entity affected (e.g., 'Pot')
 * @param {number} [options.entityId] - ID of the entity affected
 * @param {number} [options.potIdContext] - ID of the pot this action is related to
 * @param {object} [options.changes] - Details of what changed
 * @param {string} [options.description] - Human-readable description (optional - will be generated if not provided)
 * @param {object} [options.metadata] - Additional metadata for context
 * @param {object} [options.transaction] - Sequelize transaction object
 */
const logHistory = async ({
  userId,
  actionType,
  entityType,
  entityId,
  potIdContext,
  changes,
  description,
  metadata = {},
  transaction
}) => {
  try {
    // Generate user-friendly description if not provided
    const finalDescription = description || generateSmartDescription({
      actionType,
      entityType,
      entityId,
      potIdContext,
      changes,
      metadata,
      userId
    });

    // Enhance changes object with computed values
    const enhancedChanges = enhanceChangesObject(changes, actionType, metadata);

    await TransactionHistory.create({
      userId,
      actionType,
      entityType,
      entityId,
      potIdContext,
      changes: enhancedChanges,
      description: finalDescription,
    }, { transaction });

  } catch (error) {
    console.error('Failed to log history:', error);
    // In production, you might want to send this to a monitoring service
    // but don't throw to avoid breaking the main transaction
  }
};

/**
 * Generates smart, user-friendly descriptions based on action context
 */
const generateSmartDescription = ({
  actionType,
  entityType,
  entityId,
  potIdContext,
  changes,
  metadata,
  userId
}) => {
  const userName = metadata.userName || metadata.userFullName || `User ${userId}`;
  const potName = metadata.potName || (potIdContext ? `Pot ${potIdContext}` : 'Unknown Pot');
  const targetUserName = metadata.targetUserName || metadata.targetUser || 'a user';
  
  // Business-friendly action descriptions
  switch (actionType) {
    // Pot Management
    case 'CREATE_POT':
      const targetAmount = changes?.targetAmount ? ` with a target of $${changes.targetAmount}` : '';
      return `${userName} created a new savings pot "${potName}"${targetAmount}`;
      
    case 'UPDATE_POT':
      const updatedFields = [];
      if (changes?.name) updatedFields.push(`name to "${changes.name}"`);
      if (changes?.targetAmount) updatedFields.push(`target amount to $${changes.targetAmount}`);
      if (changes?.description) updatedFields.push('description');
      if (changes?.status) updatedFields.push(`status to ${changes.status}`);
      
      const changesText = updatedFields.length > 0 ? ` (updated ${updatedFields.join(', ')})` : '';
      return `${userName} modified the savings pot "${potName}"${changesText}`;
      
    case 'DELETE_POT':
      return `${userName} deleted the savings pot "${potName}"`;
      
    case 'POT_COMPLETED':
      const finalAmount = changes?.finalAmount ? ` Final amount: $${changes.finalAmount}` : '';
      return `Savings pot "${potName}" was completed successfully.${finalAmount}`;
      
    case 'POT_CANCELLED':
      const reason = changes?.reason ? ` Reason: ${changes.reason}` : '';
      return `Savings pot "${potName}" was cancelled.${reason}`;

    // Member Management
    case 'JOIN_POT':
      return `${userName} joined the savings pot "${potName}"`;
      
    case 'LEAVE_POT':
      return `${userName} left the savings pot "${potName}"`;
      
    case 'KICK_USER':
      const reason2 = changes?.reason ? ` Reason: ${changes.reason}` : '';
      return `${targetUserName} was removed from "${potName}" by ${userName}.${reason2}`;

    // Financial Actions
    case 'MAKE_PAYMENT':
      const amount = changes?.amount || changes?.paymentAmount || 0;
      const paymentMethod = changes?.paymentMethod ? ` via ${changes.paymentMethod}` : '';
      return `${userName} made a payment of $${amount} to "${potName}"${paymentMethod}`;
      
    case 'TRANSFER':
      const transferAmount = changes?.amount || 0;
      const fromAccount = changes?.fromAccount || 'account';
      const toAccount = changes?.toAccount || 'account';
      return `${userName} transferred $${transferAmount} from ${fromAccount} to ${toAccount}`;
      
    case 'REFUND':
      const refundAmount = changes?.amount || 0;
      const refundReason = changes?.reason ? ` (${changes.reason})` : '';
      return `${userName} processed a refund of $${refundAmount}${refundReason}`;

    // User Management
    case 'CREATE_USER':
      const newUserName = changes?.firstName && changes?.lastName ? 
        `${changes.firstName} ${changes.lastName}` : targetUserName;
      const role = changes?.role ? ` as ${changes.role}` : '';
      return `${userName} created a new account for ${newUserName}${role}`;
      
    case 'UPDATE_USER':
      const userUpdates = [];
      if (changes?.firstName || changes?.lastName) userUpdates.push('name');
      if (changes?.email) userUpdates.push('email');
      if (changes?.mobile) userUpdates.push('phone number');
      if (changes?.role) userUpdates.push(`role to ${changes.role}`);
      
      const userChangesText = userUpdates.length > 0 ? ` (updated ${userUpdates.join(', ')})` : '';
      return `${userName} updated ${targetUserName}'s profile${userChangesText}`;
      
    case 'DELETE_USER':
      return `${userName} deleted ${targetUserName}'s account`;
      
    case 'ROLE_CHANGE':
      const oldRole = changes?.oldRole || 'previous role';
      const newRole = changes?.newRole || 'new role';
      return `${userName} changed ${targetUserName}'s role from ${oldRole} to ${newRole}`;

    // System Actions
    case 'LOGIN':
      const loginLocation = metadata.ipAddress ? ` from ${metadata.ipAddress}` : '';
      return `${userName} logged into the system${loginLocation}`;
      
    case 'LOGOUT':
      return `${userName} logged out of the system`;
      
    case 'PAYMENT_REMINDER':
      return `Payment reminder sent to ${targetUserName} for "${potName}"`;

    // Default case
    default:
      const entityText = entityType ? ` on ${entityType.toLowerCase()}` : '';
      const entityIdText = entityId ? ` (ID: ${entityId})` : '';
      return `${userName} performed ${actionType.toLowerCase().replace(/_/g, ' ')}${entityText}${entityIdText}`;
  }
};

/**
 * Enhances the changes object with computed values for better analysis
 */
const enhanceChangesObject = (changes, actionType, metadata) => {
  if (!changes || typeof changes !== 'object') {
    changes = {};
  }

  // Add metadata timestamp
  changes.timestamp = new Date().toISOString();
  
  // Add IP address if available
  if (metadata.ipAddress) {
    changes.ipAddress = metadata.ipAddress;
  }
  
  // Add user agent if available
  if (metadata.userAgent) {
    changes.userAgent = metadata.userAgent;
  }
  
  // Add computed fields based on action type
  switch (actionType) {
    case 'MAKE_PAYMENT':
    case 'TRANSFER':
    case 'REFUND':
      // Ensure amount is stored as a number
      if (changes.amount) {
        changes.amount = parseFloat(changes.amount);
      }
      if (changes.paymentAmount) {
        changes.paymentAmount = parseFloat(changes.paymentAmount);
      }
      break;
      
    case 'CREATE_POT':
    case 'UPDATE_POT':
      // Store pot-specific metadata
      if (changes.targetAmount) {
        changes.targetAmount = parseFloat(changes.targetAmount);
      }
      if (changes.weeklyAmount) {
        changes.weeklyAmount = parseFloat(changes.weeklyAmount);
      }
      break;
  }
  
  // Add action category for easier filtering
  changes.actionCategory = categorizeAction(actionType);
  changes.actionPriority = determineActionPriority(actionType);
  
  return changes;
};

/**
 * Categorizes actions for better organization
 */
const categorizeAction = (actionType) => {
  const categories = {
    'pot_management': ['CREATE_POT', 'UPDATE_POT', 'DELETE_POT', 'POT_COMPLETED', 'POT_CANCELLED'],
    'member_management': ['JOIN_POT', 'LEAVE_POT', 'KICK_USER'],
    'financial': ['MAKE_PAYMENT', 'TRANSFER', 'REFUND'],
    'user_management': ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'ROLE_CHANGE'],
    'system': ['LOGIN', 'LOGOUT', 'PAYMENT_REMINDER']
  };

  for (const [category, actions] of Object.entries(categories)) {
    if (actions.includes(actionType)) return category;
  }
  return 'other';
};

/**
 * Determines action priority for highlighting important events
 */
const determineActionPriority = (actionType) => {
  const highPriority = ['DELETE_POT', 'DELETE_USER', 'KICK_USER', 'POT_CANCELLED', 'ROLE_CHANGE'];
  const mediumPriority = ['CREATE_POT', 'TRANSFER', 'REFUND', 'CREATE_USER'];
  
  if (highPriority.includes(actionType)) return 'high';
  if (mediumPriority.includes(actionType)) return 'medium';
  return 'low';
};

/**
 * Convenience functions for common logging scenarios
 */

// Log pot-related actions
const logPotAction = async (actionType, { userId, potId, potName, changes = {}, metadata = {}, transaction }) => {
  return logHistory({
    userId,
    actionType,
    entityType: 'Pot',
    entityId: potId,
    potIdContext: potId,
    changes,
    metadata: { ...metadata, potName },
    transaction
  });
};

// Log user-related actions
const logUserAction = async (actionType, { userId, targetUserId, targetUserName, changes = {}, metadata = {}, transaction }) => {
  return logHistory({
    userId,
    actionType,
    entityType: 'User',
    entityId: targetUserId,
    changes,
    metadata: { ...metadata, targetUserName },
    transaction
  });
};

// Log financial actions
const logFinancialAction = async (actionType, { userId, amount, potId, potName, changes = {}, metadata = {}, transaction }) => {
  return logHistory({
    userId,
    actionType,
    entityType: 'Payment',
    potIdContext: potId,
    changes: { ...changes, amount },
    metadata: { ...metadata, potName },
    transaction
  });
};

// Log system actions
const logSystemAction = async (actionType, { userId, metadata = {}, transaction }) => {
  return logHistory({
    userId,
    actionType,
    entityType: 'System',
    changes: {},
    metadata,
    transaction
  });
};

module.exports = { 
  logHistory, 
  logPotAction, 
  logUserAction, 
  logFinancialAction, 
  logSystemAction,
  generateSmartDescription,
  categorizeAction,
  determineActionPriority
};