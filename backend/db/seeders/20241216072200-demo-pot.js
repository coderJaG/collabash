'use strict';

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    options.tableName = 'Pots';
    await queryInterface.bulkInsert(options, [
      {
        ownerId: 2, 
        ownerName: 'Demo lition',
        name: 'Community Fund',
        hand: 250.00,
        amount: 5000.00,
        startDate: '2025-08-01',
        endDate: '2025-08-08',
        status: 'Not Started',
        frequency: 'weekly',
      },
      {
        ownerId: 1, 
        ownerName: 'Demo lition',
        name: 'Vacation Club',
        hand: 100.00,
        amount: 1200.00,
        startDate: '2025-07-04',
        endDate: '2025-07-18',
        status: 'Active',
        frequency: 'weekly',
    
      },
      {
        ownerId: 2,
        ownerName: 'Demo Lition',
        name: 'Friends and Family',
        hand: 150.00,
        amount: 150.00,
        startDate: '2024-11-10',
        endDate: '2025-11-10',
        status: 'Ended',
        frequency: 'every-2-weeks'
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'Pots';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      name: { [Op.in]: ['Community Fund', 'Vacation Club', 'Friends and Family'] }
    }, {});
  } 
};