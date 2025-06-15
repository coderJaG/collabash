'use strict';

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    options.tableName = 'TransactionHistories';
    await queryInterface.bulkInsert(options, [
      {
        userId: 1, // Assumes a user with ID 1 (e.g., the banker) performed the action.
        actionType: 'CREATE_POT',
        entityType: 'Pot',
        entityId: 1, // Assumes this action relates to the Pot with ID 1.
        potIdContext: 1, // The context is the pot itself.
        changes: JSON.stringify({ // Storing the 'changes' object as a JSON string.
          name: 'Community Fund',
          hand: 250.00,
          status: 'Not Started'
        }),
        description: 'Banker Demo-lition created a new pot named "Community Fund".',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: 1, // The banker performed the action.
        actionType: 'ADD_USER_TO_POT',
        entityType: 'PotsUser',
        entityId: 2, // The ID of the user being added to the pot.
        potIdContext: 1, // The action is related to the pot with ID 1.
        changes: JSON.stringify({
          userId: 2,
          potId: 1,
          displayOrder: 2
        }),
        description: 'Banker Demo-lition added user John Smith to the "Community Fund" pot.',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'TransactionHistories';
    const { Op } = require('sequelize');
    // Delete the specific records we added.
    await queryInterface.bulkDelete(options, {
      description: {
        [Op.in]: [
          'Banker Demo-lition created a new pot named "Community Fund".',
          'Banker Demo-lition added user John Smith to the "Community Fund" pot.'
        ]
      }
    }, {});
  }
};
