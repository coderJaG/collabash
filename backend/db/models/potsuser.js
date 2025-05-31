'use strict';
const { Model } = require('sequelize');


module.exports = (sequelize, DataTypes) => {
  class PotsUser extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      
    }
  }
  PotsUser.init({
    potId: {
      type:DataTypes.INTEGER
    },
    userId: {
      type:DataTypes.INTEGER
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    
    drawDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'PotsUser',
  });
  return PotsUser;
};