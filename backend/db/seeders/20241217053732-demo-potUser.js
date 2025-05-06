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
      },
      {
        potId: 2,
        userId: 3
      },
      {
        potId: 3,
        userId: 2
      },
      {
        potId: 1,
        userId: 3
      }
    ], options)
  },
  async down(queryInterface, Sequelize) {
    options.tableName = 'PotsUsers'
    return queryInterface.bulkDelete(options, {})
  }
};
