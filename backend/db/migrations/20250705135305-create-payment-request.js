'use strict';

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = options.schema ? `"${options.schema}".` : '';
    
    await queryInterface.sequelize.query(`
      CREATE TABLE ${schema}"PaymentRequests" (
        id SERIAL PRIMARY KEY,
        "paymentId" INTEGER NOT NULL,
        "requestedById" INTEGER NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'pending',
        "requestReason" TEXT,
        "reviewedById" INTEGER,
        "reviewReason" TEXT,
        "reviewedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_payment FOREIGN KEY ("paymentId") REFERENCES ${schema}"BankerPayments"(id) ON DELETE CASCADE,
        CONSTRAINT fk_requested_by FOREIGN KEY ("requestedById") REFERENCES ${schema}"Users"(id) ON DELETE CASCADE,
        CONSTRAINT fk_reviewed_by FOREIGN KEY ("reviewedById") REFERENCES ${schema}"Users"(id) ON DELETE SET NULL
      );
    `);

    // Add indexes if needed
    await queryInterface.addIndex({ tableName: 'PaymentRequests', schema: options.schema }, ['paymentId']);
    await queryInterface.addIndex({ tableName: 'PaymentRequests', schema: options.schema }, ['requestedById']);
    await queryInterface.addIndex({ tableName: 'PaymentRequests', schema: options.schema }, ['status']);
    await queryInterface.addIndex({ tableName: 'PaymentRequests', schema: options.schema }, ['reviewedById']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable({ tableName: 'PaymentRequests', schema: options.schema });
  }
};
