'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PasswordResetToken extends Model {
    static associate(models) {
      // Define association here
      PasswordResetToken.belongsTo(models.User, {
        foreignKey: 'userId',
        onDelete: 'CASCADE'
      });
    }

    // Instance method to check if token is expired
    isExpired() {
      return new Date() > this.expiresAt;
    }

    // Instance method to check if token is valid (not used and not expired)
    isValid() {
      return !this.used && !this.isExpired();
    }

    // Static method to clean up expired tokens
    static async cleanupExpired() {
      return await this.destroy({
        where: {
          expiresAt: {
            [sequelize.Sequelize.Op.lt]: new Date()
          }
        }
      });
    }

    // Static method to find valid token
    static async findValidToken(token) {
      return await this.findOne({
        where: {
          token,
          used: false,
          expiresAt: {
            [sequelize.Sequelize.Op.gt]: new Date()
          }
        },
        include: [{
          model: sequelize.models.User,
          attributes: ['id', 'email', 'firstName', 'lastName']
        }]
      });
    }

    // Static method to invalidate all tokens for a user
    static async invalidateUserTokens(userId) {
      return await this.update(
        { used: true },
        {
          where: {
            userId,
            used: false
          }
        }
      );
    }
  }

  PasswordResetToken.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'PasswordResetToken',
    tableName: 'PasswordResetTokens',
    indexes: [
      {
        fields: ['token']
      },
      {
        fields: ['expiresAt']
      },
      {
        fields: ['userId']
      }
    ]
  });

  return PasswordResetToken;
};