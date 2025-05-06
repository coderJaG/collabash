'use strict';
const { Model } = require('sequelize');


module.exports = (sequelize, DataTypes) => {
  class Pot extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Pot.belongsToMany(models.User, {
        through: models.PotsUser,
        foreignKey: 'potId',
        otherKey: 'userId'
      });
      Pot.hasMany(models.WeeklyPayment, { foreignKey: 'potId' });
    }
  }
  Pot.init({
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false
      
    },
    ownerName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    hand: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true
      
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Pot',
  });
  return Pot;
};