// backend/routes/api/history.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../utils/auth');
const { TransactionHistory, User, Pot } = require('../../db/models');
const { Op } = require('sequelize');

// GET /api/history - Fetch all transaction history (paginated, banker-only for all)
router.get('/', requireAuth, async (req, res) => {
    if (req.user.role !== 'banker') {
        // Standard users could fetch their own history via a different endpoint or query param
        return res.status(403).json({ message: "Forbidden. Only bankers can view all history." });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    try {
        const { count, rows } = await TransactionHistory.findAndCountAll({
            include: [
                { model: User, as: 'userPerformingAction', attributes: ['id', 'username', 'firstName', 'lastName'] },
                { model: Pot, as: 'relatedPot', attributes: ['id', 'name'] } // If potIdContext is used
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