'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BankerPayment extends Model {
    static associate(models) {
      BankerPayment.belongsTo(models.User, { as: 'banker', foreignKey: 'bankerId' });
      BankerPayment.belongsTo(models.Pot, { as: 'pot', foreignKey: 'potId' });
    }
  }
  BankerPayment.init({
    bankerId: { type: DataTypes.INTEGER, allowNull: false },
    potId: { type: DataTypes.INTEGER, allowNull: false },
    drawDate: { type: DataTypes.DATEONLY, allowNull: false },
    amountDue: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'due' },
    paidOn: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'BankerPayment',
  });
  return BankerPayment;
};
