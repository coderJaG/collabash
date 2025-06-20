'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class JoinRequest extends Model {
    static associate(models) {
      JoinRequest.belongsTo(models.User, { foreignKey: 'userId', as: 'requester' });
      JoinRequest.belongsTo(models.Pot, { foreignKey: 'potId' });
    }
  }
  JoinRequest.init({
    potId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'approved', 'denied']]
      }
    }
  }, {
    sequelize,
    modelName: 'JoinRequest',
  });
  return JoinRequest;
};