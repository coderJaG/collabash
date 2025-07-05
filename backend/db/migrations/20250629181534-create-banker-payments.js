'use strict';
/** @type {import('sequelize-cli').Migration} */


'use strict';

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // Define schema-aware table names to reference
    const usersTableName = { tableName: 'Users', schema: options.schema };
    const potsTableName = { tableName: 'Pots', schema: options.schema };

    await queryInterface.createTable('BankerPayments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      bankerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: usersTableName, key: 'id' },
        onDelete: 'CASCADE'
      },
      potId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: potsTableName, key: 'id' }, 
        onDelete: 'CASCADE'
      },
      drawDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      amountDue: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'due' // 'due', 'paid', 'overdue'
      },
      paidOn: {
        type: Sequelize.DATE
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
  },
  async down(queryInterface, Sequelize) {
    options.tableName = 'BankerPayments';
    await queryInterface.dropTable(options);
  }
};
