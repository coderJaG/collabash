'use strict';

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = options.schema ? `"${options.schema}".` : '';
    
    await queryInterface.sequelize.query(`
      CREATE TABLE ${schema}"PasswordResetTokens" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        token VARCHAR UNIQUE NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user FOREIGN KEY ("userId") REFERENCES ${schema}"Users"(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Add indexes for faster token lookups and cleanup
    await queryInterface.addIndex({ tableName: 'PasswordResetTokens', schema: options.schema }, ['token'], {
      name: 'password_reset_tokens_token_idx'
    });
    
    await queryInterface.addIndex({ tableName: 'PasswordResetTokens', schema: options.schema }, ['expiresAt'], {
      name: 'password_reset_tokens_expires_at_idx'
    });
    
    await queryInterface.addIndex({ tableName: 'PasswordResetTokens', schema: options.schema }, ['userId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable({ tableName: 'PasswordResetTokens', schema: options.schema });
  }
};