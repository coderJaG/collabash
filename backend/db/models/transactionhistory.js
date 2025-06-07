'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TransactionHistory extends Model {
    static associate(models) {
      TransactionHistory.belongsTo(models.User, { foreignKey: 'userId', as: 'userPerformingAction' });
      TransactionHistory.belongsTo(models.Pot, { foreignKey: 'potIdContext', as: 'relatedPot' });
      // Add other associations if needed, e.g., if entityType and entityId point to specific models
    }
  }
  TransactionHistory.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    actionType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    entityType: DataTypes.STRING,
    entityId: DataTypes.INTEGER,
    potIdContext: DataTypes.INTEGER,
    changes: DataTypes.JSONB, // or DataTypes.JSON
    description: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'TransactionHistory',
  });
  return TransactionHistory;
};