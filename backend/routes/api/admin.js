const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../../utils/auth');
const { PERMISSIONS } = require('../../utils/roles');
const { User, Pot, BankerPayment } = require('../../db/models');

// A helper function to dynamically set status
const withDynamicStatus = (payments) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return payments.map(p => {
        const payment = p.toJSON();
        const drawDate = new Date(payment.drawDate);
        if (payment.status === 'due' && drawDate > today) {
            payment.status = 'scheduled';
        }
        return payment;
    });
};

// GET /api/admin/payments (For Superadmin)
router.get('/payments', requireAuth, requirePermission(PERMISSIONS.VIEW_ADMIN_REPORTS), async (req, res) => {
    try {
        const paymentsFromDb = await BankerPayment.findAll({
            include: [
                { model: User, as: 'banker', attributes: ['id', 'username', 'firstName', 'lastName', 'role'] },
                { model: Pot, as: 'pot', attributes: ['id', 'name'] }
            ],
            order: [['drawDate', 'ASC']]
        });
        const payments = withDynamicStatus(paymentsFromDb);
        res.json({ payments });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch payment reports." });
    }
});

// GET /api/admin/banker-payments (For Bankers) 
router.get('/banker-payments', requireAuth, requirePermission(PERMISSIONS.VIEW_OWN_FEE_REPORTS), async (req, res) => {
    try {
      const currUser = req.user;
      const bankerPots = await Pot.findAll({ where: { ownerId: currUser.id }, attributes: ['id'] });
      if (bankerPots.length === 0) return res.json({ payments: [] });
      const potIds = bankerPots.map(pot => pot.id);
      const paymentsFromDb = await BankerPayment.findAll({
        where: { potId: potIds },
        include: [ { model: User, as: 'banker' }, { model: Pot, as: 'pot' } ],
        order: [['drawDate', 'ASC']]
      });
      const payments = withDynamicStatus(paymentsFromDb);
      res.json({ payments });
    } catch (error) {
      console.error('Error fetching banker payment reports:', error);
      res.status(500).json({ message: "Failed to fetch your payment reports." });
    }
});


// POST /api/admin/payments/:paymentId/request-approval (Banker's action)
router.post('/payments/:paymentId/request-approval', requireAuth, requirePermission(PERMISSIONS.VIEW_OWN_FEE_REPORTS), async (req, res) => {
    const { paymentId } = req.params;
    const { id: bankerId } = req.user;
    try {
        const payment = await BankerPayment.findByPk(paymentId, { include: 'pot' });
        if (!payment) return res.status(404).json({ message: "Payment not found." });
        if (payment.pot.ownerId !== bankerId) return res.status(403).json({ message: "Forbidden." });
        if (payment.status !== 'due') return res.status(400).json({ message: "Only due payments can be submitted for approval." });
        payment.status = 'pending';
        await payment.save();
        const fullUpdatedPayment = await BankerPayment.findByPk(payment.id, { include: [{ model: User, as: 'banker' }, { model: Pot, as: 'pot' }] });
        res.json(fullUpdatedPayment);
    } catch (error) {
        res.status(500).json({ message: "Failed to request approval." });
    }
});

// POST /api/admin/payments/:paymentId/approve (Admin's action)
router.post('/payments/:paymentId/approve', requireAuth, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), async (req, res) => {
    try {
        const payment = await BankerPayment.findByPk(req.params.paymentId);
        if (!payment) return res.status(404).json({ message: "Payment not found." });
        if (payment.status !== 'pending') return res.status(400).json({ message: "Only pending payments can be approved." });
        payment.status = 'paid';
        payment.paidOn = new Date();
        await payment.save();
        const fullUpdatedPayment = await BankerPayment.findByPk(payment.id, { include: [ { model: User, as: 'banker' }, { model: Pot, as: 'pot' } ] });
        res.json(fullUpdatedPayment);
    } catch (error) {
        res.status(500).json({ message: "Failed to approve payment." });
    }
});

// POST /api/admin/payments/:paymentId/deny (Admin's action)
router.post('/payments/:paymentId/deny', requireAuth, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), async (req, res) => {
    try {
        const payment = await BankerPayment.findByPk(req.params.paymentId);
        if (!payment) return res.status(404).json({ message: "Payment not found." });
        if (payment.status !== 'pending') return res.status(400).json({ message: "Only pending payments can be denied." });
        payment.status = 'due';
        await payment.save();
        const fullUpdatedPayment = await BankerPayment.findByPk(payment.id, { include: [ { model: User, as: 'banker' }, { model: Pot, as: 'pot' } ] });
        res.json(fullUpdatedPayment);
    } catch (error) {
        res.status(500).json({ message: "Failed to deny payment." });
    }
});


// PUT /api/admin/payments/:paymentId - Mark a payment as paid directly (Superadmin Only)
router.put('/payments/:paymentId', requireAuth, requirePermission(PERMISSIONS.MANAGE_PAYMENTS), async (req, res) => {
    try {
        const payment = await BankerPayment.findByPk(req.params.paymentId);
        if (!payment) {
            return res.status(404).json({ message: "Payment not found." });
        }
        if (payment.status !== 'due') {
            return res.status(400).json({ message: "Only due payments can be directly marked as paid." });
        }

        payment.status = 'paid';
        payment.paidOn = new Date();
        await payment.save();

        const fullUpdatedPayment = await BankerPayment.findByPk(payment.id, {
            include: [ { model: User, as: 'banker' }, { model: Pot, as: 'pot' } ]
        });
        res.json(fullUpdatedPayment);

    } catch (error) {
        console.error("Error marking payment as paid:", error);
        res.status(500).json({ message: "Failed to mark payment as paid." });
    }
});

// PUT /api/admin/users/:userId/status - Suspend a banker (Superadmin Only)
router.put('/users/:userId/status', requireAuth, requirePermission(PERMISSIONS.MANAGE_BANKER_STATUS), async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;

    if (role !== 'suspended') {
        return res.status(400).json({ message: "This route can only be used to suspend users." });
    }

    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        if (user.role !== 'banker') {
            return res.status(400).json({ message: "Only users with the 'banker' role can be suspended." });
        }

        user.role = 'suspended';
        await user.save();
        
        // Return only safe, non-sensitive user information
        res.json({ id: user.id, username: user.username, role: user.role });
    } catch (error) {
        console.error("Error updating user status:", error);
        res.status(500).json({ message: "Failed to update user status." });
    }
});




module.exports = router;