// admin.js

const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../../utils/auth');
const { PERMISSIONS } = require('../../utils/roles');
const { User, Pot, BankerPayment } = require('../../db/models');
const { Op } = require('sequelize');

// GET /api/admin/payments - Fetch all payment records (No changes needed)
router.get(
  '/payments',
  requireAuth,
  requirePermission(PERMISSIONS.VIEW_ADMIN_REPORTS),
  async (req, res) => {
    try {
        const payments = await BankerPayment.findAll({
            include: [
                { model: User, as: 'banker', attributes: ['id', 'username', 'firstName', 'lastName'] },
                { model: Pot, as: 'pot', attributes: ['id', 'name'] }
            ],
            order: [['drawDate', 'DESC']]
        });
        // This correctly sends a list of payments, each with a .banker and .pot
        res.json({ payments });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch payment reports." });
    }
});

// PUT /api/admin/payments/:paymentId - Mark a payment as paid (THIS ROUTE IS NOW FIXED)
router.put(
  '/payments/:paymentId',
  requireAuth,
  requirePermission(PERMISSIONS.VIEW_ADMIN_REPORTS),
  async (req, res) => {
    const { paymentId } = req.params;
    const { status } = req.body;

    if (status !== 'paid') {
        return res.status(400).json({ message: "Invalid status. Can only be marked as 'paid'."});
    }

    try {
        const payment = await BankerPayment.findByPk(paymentId);
        if (!payment) {
            return res.status(404).json({ message: "Payment record not found." });
        }
        payment.status = 'paid';
        payment.paidOn = new Date();
        await payment.save();

      
        const updatedPaymentWithAssociations = await BankerPayment.findByPk(paymentId, {
            include: [
                { model: User, as: 'banker', attributes: ['id', 'username', 'firstName', 'lastName'] },
                { model: Pot, as: 'pot', attributes: ['id', 'name'] }
            ]
        });

        // Now, we return the complete object, ensuring the frontend state doesn't get corrupted.
        res.json(updatedPaymentWithAssociations);
        // --- END OF FIX ---

    } catch (error) {
        res.status(500).json({ message: "Failed to update payment status." });
    }
});


// PUT /api/admin/users/:userId/status - (No changes needed)
router.put(
  '/users/:userId/status',
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_BANKER_STATUS),
  async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body; // Expecting 'suspended' or 'banker'

    if (!['suspended', 'banker'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'suspended' or 'banker'." });
    }

    try {
        const user = await User.findByPk(userId);
        if (!user || (user.role !== 'banker' && user.role !== 'suspended')) {
            return res.status(404).json({ message: "Banker not found."});
        }
        user.role = role;
        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Failed to update user status." });
    }
  }
);


module.exports = router;