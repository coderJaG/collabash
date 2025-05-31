'use strict';
const { PotsUser } = require('../models');

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA
}
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await PotsUser.bulkCreate([
      {
        potId: 1,
        userId: 2,
        displayOrder: 1,
        drawDate: '05/25/2025'
      },
      {
        potId: 2,
        userId: 3,
        displayOrder: 1,
        drawDate: '05/25/2025'
      },
      {
        potId: 3,
        userId: 2,
        displayOrder: 1,
        drawDate: '05/25/2025'
      },
      {
        potId: 1,
        userId: 3,
        displayOrder: 2,
        drawDate: '06/01/2025'
      }
    ], options)
  },
  async down(queryInterface, Sequelize) {
    options.tableName = 'PotsUsers'
    return queryInterface.bulkDelete(options, {})
  }
};
