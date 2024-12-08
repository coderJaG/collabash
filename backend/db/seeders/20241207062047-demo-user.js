'use strict';

const { User } = require('../models')
const bcrypt = require('bcryptjs')

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await User.bulkCreate([
      {
        firstName: 'Demo',
        lastName: 'Lition',
        username: 'Demo-lition',
        email: 'demo@demo.io',
        mobile: '239-932-2392',
        hashedPassword: bcrypt.hashSync('password'),
        role: 'banker'
      },
      {
        firstName: 'Fake',
        lastName: 'User',
        username: 'TestUser1',
        email: 'user1@test.io',
        mobile: '999-999-9999',
        hashedPassword: bcrypt.hashSync('password2'),
        role: 'standard'
      },
      {
        firstName: 'Test',
        lastName: 'User',
        username: 'TestUser2',
        email: 'user2@test.io',
        mobile: '111-111-1111',
        hashedPassword: bcrypt.hashSync('password3'),
        role: 'standard'
      }
    ], { validate: true });
  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'Users';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      username: { [Op.in]: ['Demo-lition', 'TestUser1', 'TestUser2'] }
    }, {})
  }
};
