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
        ownerName: 'Demo Lition',
        name: 'Cash Pot',
        hand: 20.00,
        amount: 40.00,
        startDate: '2024-12-01',
        endDate: '2026-06-02',
        Status: 'Not Started'
      },
      {
        ownerId: 1,
        ownerName: 'Demo Lition',
        name: 'Rainy Day',
        hand: 100.00,
        amount: 100.00,
        startDate: '2023-11-10',
        endDate: '2025-10-10',
        Status: 'Active'
      },
      {
        ownerId: 1,
        ownerName: 'Demo Lition',
        name: 'Friends and Family',
        hand: 150.00,
        amount: 150.00,
        startDate: '2024-11-10',
        endDate: '2025-11-10',
        Status: 'Ended'
      }
    ], options);

  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'Pots'
    return queryInterface.bulkDelete(options, {})
  }
};
