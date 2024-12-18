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
    ownerId: DataTypes.INTEGER,
    name: DataTypes.STRING,
    amount: DataTypes.DECIMAL
  }, {
    sequelize,
    modelName: 'Pot',
  });
  return Pot;
};