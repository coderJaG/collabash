'use strict';
/** @type {import('sequelize-cli').Migration} */

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      options.tableName = 'Pots',
      options.columnName = 'frequency',
      {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'weekly' // 'weekly', 'every-2-weeks', 'monthly'
      }, options);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      options.tableName = 'Pots',
      options.columnName = 'frequency'
    );
  }
};
