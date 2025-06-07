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
        otherKey: 'userId',
        as: 'Users'
      }); 
      Pot.hasMany(models.WeeklyPayment, { foreignKey: 'potId' });
      Pot.hasMany(models.TransactionHistory, { foreignKey: 'potIdContext', as: 'relatedHistory' });
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
      type: DataTypes.DATEONLY,
      allowNull: true
      
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Not Started'
    }
  }, {
    sequelize,
    modelName: 'Pot',
  });
  return Pot;
};