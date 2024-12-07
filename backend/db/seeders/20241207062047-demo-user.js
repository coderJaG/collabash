'use strict';

const { User } = require('../models')
const bcrypt = require('bcryptjs')

let options = {};
if (process.env.NODE_ENV === 'production'){
  options.schema = process.env.SCHEMA;
  }

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await User.bulkCreate([
      {
        email: 'demo@demo.io',
        username: 'Demo-lition',
        hashedPassword: bcrypt.hashSync('password')
      },
      {
        email: 'user1@test.io',
        username: 'TestUser1',
        hashedPassword: bcrypt.hashSync('password2')
      },
      {
        email: 'user2@test.io',
        username: 'TestUser2',
        hashedPassword: bcrypt.hashSync('password3')
      }
    ], { validate: true });
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'Users';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      username: { [Op.in]: ['Demo-lition', 'TestUser1', 'TestUser2']}
    }, {})
  }
};
