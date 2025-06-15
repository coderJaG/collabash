'use strict';

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA; // Define schema for Staging/Production
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TransactionHistories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },  
      userId: { // User who performed the action
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users', // Assuming your users table is named 'Users'
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL' // Or 'CASCADE' if you want history deleted with user
      },
      actionType: { // e.g., 'CREATE_POT', 'UPDATE_USER_ROLE', 'ADD_USER_TO_POT'
        type: Sequelize.STRING,
        allowNull: false
      },
      entityType: { // e.g., 'Pot', 'User', 'PotsUser', 'WeeklyPayment'
        type: Sequelize.STRING,
        allowNull: true
      },
      entityId: { // ID of the entity that was affected
        type: Sequelize.INTEGER,
        allowNull: true
      },
      potIdContext: { // Optional: If the action is related to a specific pot, store its ID here for easier filtering
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
            model: 'Pots',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      changes: { // Store a JSON object of what changed (before/after, or just the new data)
        type: Sequelize.JSONB, // Use JSONB for PostgreSQL for better performance, or JSON for SQLite/MySQL
        allowNull: true
      },
      description: { // A human-readable description of the action
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: { // Though typically history records aren't updated, Sequelize adds this by default
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, options);
  },
  async down(queryInterface, Sequelize) {
    options.tableName = "TransactionHistories";
    await queryInterface.dropTable(options);
  }
};