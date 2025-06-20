//routes/api/transactions.js
const express = require('express');
const { requireAuth, requirePermission } = require('../../utils/auth');
const { PERMISSIONS } = require('../../utils/roles');
const { WeeklyPayment, sequelize } = require('../../db/models'); // Import sequelize
const { logHistory } = require('../../utils/historyLogger'); // Import the logger
const { Op } = require('sequelize');

const router = express.Router();


// GET /api/transactions/pot/:potId?weekNumber=<value> - Fetch weekly statuses
router.get('/pot/:potId', requireAuth, async (req, res) => {
    
    const { potId } = req.params;
    const { weekNumber } = req.query;

    if (!weekNumber) {
        return res.status(400).json({ message: "Missing 'weekNumber' query parameter" });
    }
    const numWeek = parseInt(weekNumber, 10);
    const numPotId = parseInt(potId, 10);

    if (isNaN(numWeek) || numWeek <= 0) {
        return res.status(400).json({ message: "Invalid 'weekNumber' query parameter. Must be a positive integer." });
    }
    if (isNaN(numPotId)) {
        return res.status(400).json({ message: "Invalid Pot ID in URL path." });
    }

    try {
        const weeklyPayments = await WeeklyPayment.findAll({
            where: {
                potId: numPotId,
                weekNumber: numWeek,
            },
        });

        const statusMap = weeklyPayments.reduce((acc, payment) => {
            acc[payment.userId] = {
                paidHand: payment.paidHand,
                gotDraw: payment.gotDraw,
                id: payment.id
            };
            return acc;
        }, {});

        res.json(statusMap);

    } catch (error) {
        console.error("Error fetching weekly payments:", error);
        res.status(500).json({ message: "Failed to fetch weekly payment statuses." });
    }
});


// PUT /api/transactions - updates and creates transactions
router.put('/', requireAuth, requirePermission(PERMISSIONS.MANAGE_POT_MEMBERS), async (req, res) => {
    const currUser = req.user;
    const { potId, userId, weekNumber, paymentType, isPaid } = req.body;
    if (potId === null || userId === null || weekNumber === null || paymentType === null || isPaid === null) {
        return res.status(400).json({ message: "Missing required fields (potId, userId, weekNumber, paymentType, isPaid)" });
    }
    if (typeof isPaid !== 'boolean') {
        return res.status(400).json({ message: "isPaid must be a boolean value" });
    }
    if (paymentType !== 'paidHand' && paymentType !== 'gotDraw') {
        return res.status(400).json({ message: "Invalid paymentType. Must be 'paidHand' or 'gotDraw'." });
    }
    const numPotId = parseInt(potId, 10);
    const numUserId = parseInt(userId, 10);
    const numWeekNumber = parseInt(weekNumber, 10);

    if (isNaN(numPotId) || isNaN(numUserId) || isNaN(numWeekNumber)) {
        return res.status(400).json({ message: "Invalid ID or week number provided." });
    }
    
    const t = await sequelize.transaction();
    try {
        const [transactionRecord, created] = await WeeklyPayment.findOrCreate({
            where: { potId: numPotId, userId: numUserId, weekNumber: numWeekNumber },
            defaults: {
                potId: numPotId, userId: numUserId, weekNumber: numWeekNumber,
                paidHand: paymentType === 'paidHand' ? isPaid : false,
                gotDraw: paymentType === 'gotDraw' ? isPaid : false,
            },
            transaction: t
        });

        let actionType = 'CREATE_PAYMENT';
        let changes = { newRecord: transactionRecord.toJSON() };
        let description = `Banker ${currUser.username} recorded initial payment for user ID ${numUserId} in pot ID ${numPotId} for week ${numWeekNumber}: ${paymentType} set to ${isPaid}.`;

        if (!created) {
            actionType = 'UPDATE_PAYMENT';
            const oldValues = { paidHand: transactionRecord.paidHand, gotDraw: transactionRecord.gotDraw };

            if (paymentType === 'paidHand' && transactionRecord.paidHand !== isPaid) {
                transactionRecord.paidHand = isPaid;
                changes = { paidHand: { old: oldValues.paidHand, new: isPaid } };
                description = `Banker ${currUser.username} updated 'paidHand' to ${isPaid} for user ID ${numUserId}, pot ID ${numPotId}, week ${numWeekNumber}.`;
            } else if (paymentType === 'gotDraw' && transactionRecord.gotDraw !== isPaid) {
                transactionRecord.gotDraw = isPaid;
                changes = { gotDraw: { old: oldValues.gotDraw, new: isPaid } };
                description = `Banker ${currUser.username} updated 'gotDraw' to ${isPaid} for user ID ${numUserId}, pot ID ${numPotId}, week ${numWeekNumber}.`;
            } else {
                await t.commit(); // Commit the transaction even if no log is made
                return res.json(transactionRecord.toJSON());
            }
            await transactionRecord.save({ transaction: t });
        }

        await logHistory({
            userId: currUser.id,
            actionType: actionType,
            entityType: 'WeeklyPayment',
            entityId: transactionRecord.id,
            potIdContext: numPotId,
            changes: changes,
            description: description,
            transaction: t
        });

        await t.commit();
        res.json(transactionRecord.toJSON());
    } catch (error) {
        await t.rollback();
        console.error("Error updating/creating weekly payment:", error);
        res.status(500).json({ message: "Failed to update payment status." });
    }
});

// DELETE /api/transactions - deletes all transactions for a user in a pot
router.delete('/', requireAuth, requirePermission(PERMISSIONS.MANAGE_POT_MEMBERS), async (req, res) => {
    const currUser = req.user;
    const { potId, userId } = req.body;

    if (potId == null || userId == null) {
        return res.status(400).json({ message: "Missing required fields (potId, userId)" });
    }
    const numPotId = parseInt(potId, 10);
    const numUserId = parseInt(userId, 10);

    if (isNaN(numPotId) || isNaN(numUserId)) {
        return res.status(400).json({ message: "Invalid ID provided." });
    }

    const t = await sequelize.transaction();
    try {
        const transactionsToDelete = await WeeklyPayment.findAll({
            where: { potId: numPotId, userId: numUserId },
            transaction: t
        });

        if (transactionsToDelete.length === 0) {
            await t.rollback();
            return res.status(404).json({ message: "No matching Transaction(s) found to delete." });
        }
        
        const deletedRecordsInfo = transactionsToDelete.map(tr => tr.toJSON());

        const numTransactionDel = await WeeklyPayment.destroy({
            where: { potId: numPotId, userId: numUserId },
            transaction: t
        });

        await logHistory({
            userId: currUser.id,
            actionType: 'DELETE_PAYMENTS_BULK',
            entityType: 'WeeklyPayment',
            entityId: numUserId, // The user whose payments were deleted
            potIdContext: numPotId,
            changes: { deletedRecords: deletedRecordsInfo },
            description: `Banker ${currUser.username} deleted all ${numTransactionDel} payment records for user ID ${numUserId} in pot ID ${numPotId}.`,
            transaction: t
        });
        
        await t.commit();
        res.json({ message: `${numTransactionDel} Transaction(s) deleted successfully.` });
    } catch (error) {
        await t.rollback();
        console.error("Error deleting transactions:", error);
        res.status(500).json({ message: "Failed to delete transaction." });
    }
});

module.exports = router;