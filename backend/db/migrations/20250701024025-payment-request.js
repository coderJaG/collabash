'use strict';

let options = {};
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
        references: { model: 'BankerPayments' },
        onDelete: 'CASCADE'
      },
      requestedById: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users' },
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
        references: { model: 'Users' },
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

    await queryInterface.addIndex('PaymentRequests', ['paymentId'], options);
    await queryInterface.addIndex('PaymentRequests', ['requestedById'], options);
    await queryInterface.addIndex('PaymentRequests', ['status'], options);
    await queryInterface.addIndex('PaymentRequests', ['reviewedById'], options);
  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'PaymentRequests';
    await queryInterface.dropTable(options);
  }
};