// backend/utils/historyLogger.js
const { TransactionHistory } = require('../db/models');

/**
 * Logs an action to the TransactionHistory table.
 * Must be called within a Sequelize transaction if the action itself is part of one.
 * @param {object} options
 * @param {number} options.userId - ID of the user performing the action.
 * @param {string} options.actionType - Type of action (e.g., 'CREATE_POT').
 * @param {string} [options.entityType] - Type of entity affected (e.g., 'Pot').
 * @param {number} [options.entityId] - ID of the entity affected.
 * @param {number} [options.potIdContext] - ID of the pot this action is related to, if applicable.
 * @param {object} [options.changes] - Details of what changed.
 * @param {string} [options.description] - Human-readable description.
 * @param {object} [options.transaction] - Sequelize transaction object.
 */
const logHistory = async ({
  userId,
  actionType,
  entityType,
  entityId,
  potIdContext,
  changes,
  description,
  transaction // Pass the transaction object here
}) => {
  try {
    await TransactionHistory.create({
      userId,
      actionType,
      entityType,
      entityId,
      potIdContext,
      changes,
      description,
    }, { transaction }); // Ensure this create operation is part of the passed transaction
  } catch (error) {
    console.error('Failed to log history:', error);
    // Decide if this error should roll back the main transaction or be handled separately
    // For now, just logging, but in production, you might want to throw to ensure atomicity
  }
};

module.exports = { logHistory };