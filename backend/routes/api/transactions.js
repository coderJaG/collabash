
const express = require('express');
const { requireAuth } = require('../../utils/auth');
const { WeeklyPayment, Pot, User } = require('../../db/models');
const { Op } = require('sequelize');

const router = express.Router();


// GET /api/transactions/pot/:potId?weekNumber=<value> - Fetch weekly statuses

router.get('/pot/:potId', requireAuth, async (req, res) => {
    const { potId } = req.params;
    const { weekNumber } = req.query;

    // --- Validation ---
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
    // --- End Validation ---


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


// /api/transactions updates and creates transactions
router.put('/', requireAuth, async (req, res) => {

    const currUser = req.user;
    if (currUser.role !== 'banker') {
        return res.status(403).json({ message: "Forbidden: Only bankers can update payments." });
    }
    const { potId, userId, weekNumber, paymentType, isPaid } = req.body;
    //--validation--
     if (potId == null || userId == null || weekNumber == null || paymentType == null || isPaid == null) {
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
     //-- End validation--
    try {
        const [transaction, created] = await WeeklyPayment.findOrCreate({
            where: { potId: numPotId, userId: numUserId, weekNumber: numWeekNumber },
            defaults: {
                potId: numPotId, userId: numUserId, weekNumber: numWeekNumber,
                paidHand: paymentType === 'paidHand' ? isPaid : false,
                gotDraw: paymentType === 'gotDraw' ? isPaid : false,
            }
        });
        if (!created) {
            if (paymentType === 'paidHand') transaction.paidHand = isPaid;
            else if (paymentType === 'gotDraw') transaction.gotDraw = isPaid;
            await transaction.save();
        }
        res.json({
             id: transaction.id, potId: transaction.potId, userId: transaction.userId,
             weekNumber: transaction.weekNumber, paidHand: transaction.paidHand, gotDraw: transaction.gotDraw
         });
    } catch (error) {
        console.error("Error updating/creating weekly payment:", error);
        res.status(500).json({ message: "Failed to update payment status." });
    }
});

// Using PUT route handler for now
// POST /api/transactions
// router.post('/', requireAuth, async (req, res) => {
   
//     const currUser = req.user;
//     if (currUser.role !== 'banker') return res.status(403).json({ "message": "Forbidden, you must be a banker" });
//     const { potId, userId, weekNumber, paidHand, gotDraw } = req.body;
    
//     if (potId == null || userId == null || weekNumber == null || paidHand == null || gotDraw == null) {
//        return res.status(400).json({ message: "Missing required fields" });
//     }
//     try {
//         const existing = await WeeklyPayment.findOne({ where: { potId, userId, weekNumber } });
//         if (existing) {
//             return res.status(409).json({ message: "Transaction already exists." });
//         }
//         const transaction = await WeeklyPayment.create({ potId, userId, weekNumber, paidHand, gotDraw });
//         res.status(201).json(transaction);
//     } catch (error) {
//          console.error("Error creating weekly payment:", error);
//          res.status(500).json({ message: "Failed to create payment record." });
//     }
// });


module.exports = router;