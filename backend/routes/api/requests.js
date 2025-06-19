const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../utils/auth');
const { Pot, User, PotsUser, JoinRequest, sequelize } = require('../../db/models');
const { logHistory } = require('../../utils/historyLogger');
const { updatePotScheduleAndDetails } = require('../../utils/potUtils');

// --- GET /api/requests/received ---
// Get all pending join requests for pots owned by the current user (banker)
router.get('/received', requireAuth, async (req, res) => {
    const { user: currUser } = req;

    if (currUser.role !== 'banker') {
        return res.status(403).json({ message: "Forbidden: Only bankers can view received requests." });
    }

    try {
        const requests = await JoinRequest.findAll({
            where: { status: 'pending' },
            include: [
                {
                    model: Pot,
                    required: true,
                    where: { ownerId: currUser.id },
                    attributes: ['id', 'name']
                },
                {
                    model: User,
                    as: 'requester',
                    attributes: ['id', 'firstName', 'lastName', 'username']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({ JoinRequests: requests });
    } catch (error) {
        console.error("Error fetching received join requests:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// --- GET /api/requests/sent ---
// Get all requests sent by the current user
router.get('/sent', requireAuth, async (req, res) => {
    const { user: currUser } = req;
    try {
        const requests = await JoinRequest.findAll({
            where: { userId: currUser.id },
            include: [{ model: Pot, attributes: ['id', 'name', 'ownerName'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json({ SentRequests: requests });
    } catch (error) {
        console.error("Error fetching sent requests:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


// --- POST /api/requests ---
// Create a new request to join a pot
router.post('/', requireAuth, async (req, res) => {
    const { user: currUser, io, connectedUsers } = req;
    const { potId } = req.body;

    if (!potId) {
        return res.status(400).json({ message: "potId is required." });
    }

    const t = await sequelize.transaction();
    try {
        const pot = await Pot.findByPk(potId, { transaction: t });
        if (!pot) {
            await t.rollback();
            return res.status(404).json({ message: "Pot not found." });
        }

        const isMember = await PotsUser.findOne({ where: { potId, userId: currUser.id }, transaction: t });
        if (isMember) {
            await t.rollback();
            return res.status(400).json({ message: "You are already a member of this pot." });
        }

        const existingRequest = await JoinRequest.findOne({ where: { potId, userId: currUser.id, status: 'pending' }, transaction: t });
        if (existingRequest) {
            await t.rollback();
            return res.status(400).json({ message: "You already have a pending request for this pot." });
        }
        
        const newRequest = await JoinRequest.create({
            potId,
            userId: currUser.id,
            status: 'pending'
        }, { transaction: t });

        await logHistory({
            userId: currUser.id,
            actionType: 'REQUEST_JOIN_POT',
            entityType: 'JoinRequest',
            entityId: newRequest.id,
            potIdContext: potId,
            changes: { requesterId: currUser.id, potId },
            description: `User ${currUser.username} requested to join pot "${pot.name}".`,
            transaction: t
        });
        
        const bankerSocketId = connectedUsers[pot.ownerId];
        if (bankerSocketId) {
            io.to(bankerSocketId).emit('new_join_request', {
                message: `${currUser.firstName} has requested to join your pot: ${pot.name}`,
                potId: pot.id,
                potName: pot.name,
                requesterName: `${currUser.firstName} ${currUser.lastName}`
            });
        }
        
        await t.commit();
        res.status(201).json(newRequest);
    } catch (error) {
        await t.rollback();
        console.error("Error creating join request:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// --- PUT /api/requests/:requestId ---
// Approve or deny a join request
router.put('/:requestId', requireAuth, async (req, res) => {
    const { user: currUser, io, connectedUsers } = req;
    const { requestId } = req.params;
    const { status } = req.body;

    if (currUser.role !== 'banker') {
        return res.status(403).json({ message: "Forbidden: Only bankers can approve or deny requests." });
    }
    if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'denied'." });
    }

    const t = await sequelize.transaction();
    try {
        const request = await JoinRequest.findByPk(requestId, { include: [Pot], transaction: t });
        if (!request) {
            await t.rollback();
            return res.status(404).json({ message: "Request not found." });
        }
        if (request.Pot.ownerId !== currUser.id) {
            await t.rollback();
            return res.status(403).json({ message: "Forbidden: You are not the owner of this pot." });
        }
        if (request.status !== 'pending') {
            await t.rollback();
            return res.status(400).json({ message: "This request has already been actioned." });
        }

        request.status = status;
        await request.save({ transaction: t });
        
        if (status === 'approved') {
            const maxOrderResult = await PotsUser.max('displayOrder', { where: { potId: request.potId }, transaction: t });
            const nextOrder = (typeof maxOrderResult === 'number' ? maxOrderResult : 0) + 1;
            await PotsUser.create({ potId: request.potId, userId: request.userId, displayOrder: nextOrder }, { transaction: t });
            await updatePotScheduleAndDetails(request.potId, t);
        }

        await logHistory({
            userId: currUser.id,
            actionType: 'RESPOND_JOIN_REQUEST',
            entityType: 'JoinRequest',
            entityId: request.id,
            potIdContext: request.potId,
            changes: { newStatus: status, respondedToUserId: request.userId },
            description: `Banker ${currUser.username} ${status} request from user ID ${request.userId} for pot "${request.Pot.name}".`,
            transaction: t
        });
        
        const requesterSocketId = connectedUsers[request.userId];
        if (requesterSocketId) {
            io.to(requesterSocketId).emit('join_request_response', {
                message: `Your request to join pot "${request.Pot.name}" was ${status}.`,
                potId: request.potId,
                potName: request.Pot.name,
                status: status
            });
        }

        await t.commit();
        res.json(request);

    } catch (error) {
        await t.rollback();
        console.error("Error responding to join request:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = router;
