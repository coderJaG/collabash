// Create this as a new migration file: YYYYMMDDHHMMSS-create-payment-requests.js
'use strict';

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, check if table already exists and drop it if it does
    const tableExists = await queryInterface.sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${process.env.SCHEMA || 'public'}' 
        AND table_name = 'PaymentRequests'
      );`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (tableExists[0].exists) {
      await queryInterface.dropTable('PaymentRequests', options);
    }

    // Create the table with proper structure
    await queryInterface.createTable('PaymentRequests', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      paymentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { 
          model: 'BankerPayments',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      requestedById: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { 
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'denied'),
        allowNull: false,
        defaultValue: 'pending'
      },
      requestReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reviewedById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { 
          model: 'Users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      reviewReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reviewedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, options);

    // Add indexes for better performance
    await queryInterface.addIndex('PaymentRequests', ['paymentId'], options);
    await queryInterface.addIndex('PaymentRequests', ['requestedById'], options);
    await queryInterface.addIndex('PaymentRequests', ['status'], options);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PaymentRequests', options);
  }
};