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
      })
    }
  }
  Pot.init({
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false
      
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'Pot',
  });
  return Pot;
};