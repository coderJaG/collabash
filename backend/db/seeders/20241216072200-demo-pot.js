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
        amount: 10000.00,
        startDate: '12/01/2024',
        endDate: '06/02/2025',
        active: true
      },
      {
        ownerId: 1,
        ownerName: 'Demo-lition',
        name: 'Rainy Day',
        amount: 15500.00,
        startDate: '11/10/2023',
        endDate: '02/10/2024',
        active: false
      },
      {
        ownerId: 1,
        ownerName: 'Demo-lition',
        name: 'Friends and Family',
        amount: 5000.00,
        startDate: '11/10/2024',
        endDate: '02/10/2025',
        active: true
      }
    ], options);

  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'Pots'
    return queryInterface.bulkDelete(options, {})
  }
};
