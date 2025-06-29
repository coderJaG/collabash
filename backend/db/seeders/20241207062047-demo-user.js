'use strict';

const bcrypt = require('bcryptjs')

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}

const demoUsersData = [
    {
    firstName: 'Coder',
    lastName: 'Jag',
    mobile: '888-999-9999',
    email: 'coderjag@example.com',
    username: 'coderjag',
    hashedPassword: bcrypt.hashSync('password'),
    role: 'superadmin'
  },
  {
    firstName: 'Demo',
    lastName: 'Lition',
    mobile: '999-999-9999',
    email: 'banker@example.com',
    username: 'Demo-lition',
    hashedPassword: bcrypt.hashSync('password'),
    role: 'banker'
  },
  {
    firstName: 'John',
    lastName: 'Smith',
    mobile: '555-555-5555',
    email: 'john.smith@example.com',
    username: 'johnsmith',
    hashedPassword: bcrypt.hashSync('password2'),
    role: 'standard'
  },
  {
    firstName: 'Jane',
    lastName: 'Doe',
    mobile: '111-222-3333',
    email: 'jane.doe@example.com',
    username: 'janedoe',
    hashedPassword: bcrypt.hashSync('password3'),
    role: 'standard'
  }
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    options.tableName = 'Users';
    await queryInterface.bulkInsert(options, demoUsersData, {});
  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'Users';
    const Op = Sequelize.Op;
    const { User, Pot, PotsUser, JoinRequest, WeeklyPayment, TransactionHistory } = require('../models');
    const demoUsernames = demoUsersData.map(u => u.username);
    const usersToDelete = await User.findAll({
      where: { username: { [Op.in]: demoUsernames } },
      attributes: ['id']
    });
    const userIdsToDelete = usersToDelete.map(u => u.id);

    if (userIdsToDelete.length > 0) {
      await TransactionHistory.destroy({ where: { userId: { [Op.in]: userIdsToDelete } } });
      await WeeklyPayment.destroy({ where: { userId: { [Op.in]: userIdsToDelete } } });
      const potsOwnedByDemoUsers = await Pot.findAll({ where: { ownerId: { [Op.in]: userIdsToDelete } }, attributes: ['id'] });
      const potIdsOwned = potsOwnedByDemoUsers.map(p => p.id);

      await JoinRequest.destroy({
        where: {
          [Op.or]: [
            { userId: { [Op.in]: userIdsToDelete } },
            { potId: { [Op.in]: potIdsOwned } }
          ]
        }
      });
      await PotsUser.destroy({ where: { userId: { [Op.in]: userIdsToDelete } } });
      await Pot.destroy({ where: { ownerId: { [Op.in]: userIdsToDelete } } });
    }

    return queryInterface.bulkDelete(options, {
      username: { [Op.in]: demoUsernames }
    }, {});
  }
};