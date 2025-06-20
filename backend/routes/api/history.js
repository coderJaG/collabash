// backend/routes/api/history.js
const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../../utils/auth'); // Import requirePermission
const { PERMISSIONS } = require('../../utils/roles'); // Import permissions list
const { TransactionHistory, User, Pot } = require('../../db/models');
const { Op } = require('sequelize');


router.get('/', requireAuth, requirePermission(PERMISSIONS.VIEW_TRANSACTION_HISTORY), async (req, res) => {

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    try {
        const { count, rows } = await TransactionHistory.findAndCountAll({
            include: [
                { model: User, as: 'userPerformingAction', attributes: ['id', 'username', 'firstName', 'lastName'] },
                { model: Pot, as: 'relatedPot', attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            history: rows,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        console.error("Error fetching transaction history:", error);
        res.status(500).json({ message: "Failed to fetch transaction history." });
    }
});

module.exports = router;