'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class WeeklyPayment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      WeeklyPayment.belongsTo(models.User, { foreignKey: 'userId' });
      WeeklyPayment.belongsTo(models.Pot, { foreignKey: 'potId' });
    }
  }
  WeeklyPayment.init({
    potId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    weekNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    paidHand: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    gotDraw: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'WeeklyPayment',
  });
  return WeeklyPayment;
};