'use strict';
const {Pot} = require('../models')

let options = {};
if (process.env.NODE_ENV === 'prodution') {
  options.schema = process.env.SCHEMA
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await Pot.bulkCreate([
      {
        ownerId: 1,
        name: 'Cash Pot',
        amount: 10000.00
      },
      {
        ownerId: 1,
        name: 'Rainy Day',
        amount: 15500.00
      },
      {
        ownerId: 1,
        name: 'Friends and Family',
        amount: 5000.00
      }
    ], options);

  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'Pots'
    return queryInterface.bulkDelete(options, {})
  }
};
