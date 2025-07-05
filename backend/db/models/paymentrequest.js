// models/paymentrequest.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PaymentRequest extends Model {
    static associate(models) {
      // A payment request belongs to a banker payment
      PaymentRequest.belongsTo(models.BankerPayment, {
        foreignKey: 'paymentId',
        as: 'payment'
      });
      
      // A payment request is created by a banker
      PaymentRequest.belongsTo(models.User, {
        foreignKey: 'requestedById',
        as: 'requestedBy'
      });
      
      // A payment request is reviewed by a superadmin
      PaymentRequest.belongsTo(models.User, {
        foreignKey: 'reviewedById',
        as: 'reviewedBy'
      });
    }
  }

  PaymentRequest.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'BankerPayments',
        key: 'id'
      }
    },
    requestedById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'denied'),
      allowNull: false,
      defaultValue: 'pending'
    },
    requestReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason provided by banker for payment request'
    },
    reviewedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    reviewReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason provided by superadmin for approval/denial'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'PaymentRequest',
  });

  return PaymentRequest;
};