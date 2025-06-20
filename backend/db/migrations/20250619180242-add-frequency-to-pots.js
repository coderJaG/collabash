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
      'frequency',
      {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'weekly' // 'weekly', 'every-2-weeks', 'monthly'
      }, options);
  },

  async down(queryInterface, Sequelize) {
    const tableName = { tableName: 'Pots', schema: options.schema };
    await queryInterface.removeColumn(
      process.env.NODE_ENV === 'production' ? tableName : 'Pots',
      'frequency'
    );
  }
};
