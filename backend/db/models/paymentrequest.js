'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PaymentRequest extends Model {
    static associate(models) {
      PaymentRequest.belongsTo(models.BankerPayment, {
        foreignKey: 'paymentId',
        as: 'payment'
      });

      PaymentRequest.belongsTo(models.User, {
        foreignKey: 'requestedById',
        as: 'requestedBy'
      });

      PaymentRequest.belongsTo(models.User, {
        foreignKey: 'reviewedById',
        as: 'reviewedBy'
      });
    }
  }

  PaymentRequest.init({
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    requestedById: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending'
    },
    requestReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewedById: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    reviewReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'PaymentRequest',
    tableName: 'PaymentRequests',
    ...(process.env.NODE_ENV === 'production' && {
      schema: process.env.SCHEMA
    }),
  });

  return PaymentRequest;
};