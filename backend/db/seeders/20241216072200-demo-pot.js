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
        ownerName: 'Demo-lition',
        name: 'Cash Pot',
        hand: 20.00,
        amount: 10000.00,
        startDate: '12/01/2024',
        endDate: '06/02/2025',
        Status: 'Not Started'
      },
      {
        ownerId: 1,
        ownerName: 'Demo-lition',
        name: 'Rainy Day',
        hand: 100.00,
        amount: 15500.00,
        startDate: '11/10/2023',
        endDate: '02/10/2024',
        Status: 'Active'
      },
      {
        ownerId: 1,
        ownerName: 'Demo-lition',
        name: 'Friends and Family',
        hand: 150.00,
        amount: 5000.00,
        startDate: '11/10/2024',
        endDate: '02/10/2025',
        Status: 'Ended'
      }
    ], options);

  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'Pots'
    return queryInterface.bulkDelete(options, {})
  }
};
