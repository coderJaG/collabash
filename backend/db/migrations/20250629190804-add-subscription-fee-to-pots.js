'use strict';
/** @type {import('sequelize-cli').Migration} */

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = { tableName: 'Pots', schema: options.schema };
    await queryInterface.addColumn(
      process.env.NODE_ENV === 'production' ? tableName : 'Pots',
      'subscriptionFee',
      {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1.00 // A default value for existing pots
      }
    );
  },

  async down(queryInterface, Sequelize) {
    const tableName = { tableName: 'Pots', schema: options.schema };
    await queryInterface.removeColumn(
      process.env.NODE_ENV === 'production' ? tableName : 'Pots',
      'subscriptionFee'
    );
  }
};
