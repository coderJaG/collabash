// migrations/XXXXXX-create-payment-requests.js
'use strict';

let options= {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;
}

module.exports = {
  async up(queryInterface, Sequelize) {
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      requestedById: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
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
        onUpdate: 'CASCADE',
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

    // Add indexes for performance
    await queryInterface.addIndex('PaymentRequests', ['paymentId']);
    await queryInterface.addIndex('PaymentRequests', ['requestedById']);
    await queryInterface.addIndex('PaymentRequests', ['status']);
    await queryInterface.addIndex('PaymentRequests', ['reviewedById']);
  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'PaymentRequests';
    await queryInterface.dropTable(options);
  }
};