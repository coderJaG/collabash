'use strict';
const { Model, Validator } = require('sequelize');


//valdate mobile helper
const validateMobile = (num) => {
  const isValid = /^\d{3}-\d{3}-\d{4}$/.test(num)
  if (!isValid) {
    throw new Error(`Mobile number ${num} must be in the format 999-999-9999`)
  }
}

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.belongsToMany(models.Pot, {
        through: models.PotsUser,
        foreignKey: 'userId',
        otherKey: 'potId',
        as: 'PotsJoined'
      });
      User.hasMany(models.WeeklyPayment, { foreignKey: 'userId' });
     
    }
  }
  User.init({
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [4, 30],
        isNotEmail(value) {
          if (Validator.isEmail(value)) {
            throw new Error('Cannot be an email')
          }
        }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 256],
        isEmail: true
      }
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isMobile(value) {
          validateMobile(value)
        }
      }
    },
    drawDate: {
      type: DataTypes.STRING
    },
    hashedPassword: {
      type: DataTypes.STRING.BINARY,
      allowNull: false,
      validate: {
        len: [60, 60]
      }
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'standard'
    }
  }, {
    sequelize,
    modelName: 'User',
    defaultScope: {
      attributes: {
        exclude: ['username', 'hashedPassword', 'email', 'createdAt', 'updatedAt'],
      },
    },
  });
  return User;
};