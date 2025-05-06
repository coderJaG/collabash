'use strict';

const { WeeklyPayment } = require('../models')

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await WeeklyPayment.bulkCreate([{
      potId: 1,
      userId: 2,
      weekNumber: 1,
      paidHand: true,
      gotDraw: false
    },
    {
      potId: 1,
      userId: 3,
      weekNumber: 2,
      paidHand: true,
      gotDraw: false
    }], options);

  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'WeeklyPayments'
     return queryInterface.bulkDelete(options, {});
  }
};
