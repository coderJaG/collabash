// routes/api/pots.js (Updated with PostgreSQL compatible literal)
const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../../utils/auth'); // Import new middleware
const { PERMISSIONS } = require('../../utils/roles'); // Import permissions constants
const { Pot, User, PotsUser, WeeklyPayment, sequelize } = require('../../db/models');
const { logHistory } = require('../../utils/historyLogger');
const { updatePotScheduleAndDetails } = require('../../utils/potUtils');
const { Op } = require('sequelize');

// --- ROUTES ---

router.get('/', requireAuth, async (req, res) => {
    try {
        const includeUsersWithDetails = {
            model: User,
            as: 'Users',
            attributes: ['id', 'firstName', 'lastName'],
            through: {
                model: PotsUser,
                as: 'potMemberDetails',
                attributes: ['displayOrder', 'drawDate']
            }
        };

        const potsToReturn = await Pot.findAll({
            attributes: ['id', 'ownerId', 'ownerName', 'name', 'amount', 'startDate', 'endDate', 'status', 'hand', 'frequency'],
            include: [includeUsersWithDetails],
            order: [['name', 'ASC']]
        });

        const processedPots = potsToReturn.map(potInstance => {
            const pot = potInstance.toJSON ? potInstance.toJSON() : potInstance;
            if (pot.Users && Array.isArray(pot.Users)) {
                pot.Users.sort((a, b) => {
                    const orderA = a.potMemberDetails?.displayOrder || Infinity;
                    const orderB = b.potMemberDetails?.displayOrder || Infinity;
                    return orderA - orderB;
                });
            }
            return pot;
        });

        return res.json({ Pots: processedPots });

    } catch (error) {
        console.error("Error fetching pots:", error);
        return res.status(500).json({ message: "Internal server error while fetching pots." });
    }
});


router.get('/:potId', requireAuth, async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;

    try {
        const pot = await Pot.findByPk(potId, {
            attributes: ['id', 'ownerId', 'ownerName', 'name', 'hand', 'amount', 'startDate', 'endDate', 'status', 'frequency'],
            include: [{
                model: User,
                as: 'Users',
                attributes: ['id', 'firstName', 'lastName', 'username', 'email', 'mobile'],
                through: {
                    model: PotsUser,
                    as: 'potMemberDetails',
                    attributes: ['drawDate', 'displayOrder']
                }
            }],
            order: [
                [sequelize.literal('"Users->potMemberDetails"."displayOrder"'), 'ASC']
            ]
        });

        if (!pot) {
            return res.status(404).json({ "message": "Pot not found!!" });
        }

        const isOwner = pot.ownerId === currUser.id;
        const isMember = pot.Users && pot.Users.some(user => user.id === currUser.id);
        const isAuthorized = isOwner || (currUser.role === 'standard' && isMember);

        if (!isAuthorized) {
            return res.status(403).json({ "message": "Forbidden, you must be the banker or a member of the pot." });
        }
        return res.json(pot);
    } catch (error) {
        console.error(`Error fetching pot by id ${potId}:`, error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
});


router.post('/', requireAuth, requirePermission(PERMISSIONS.CREATE_POT), async (req, res) => {
    const currUser = req.user;
    const t = await sequelize.transaction();
    try {
        const { name, hand, startDate, userIds, frequency } = req.body;
        const ownerName = `${currUser.firstName} ${currUser.lastName}`;

        if (!name || hand === undefined || !startDate || !frequency) {
            await t.rollback();
            return res.status(400).json({ message: "Name, hand, start date, and frequency are required." });
        }
        const parsedHand = parseFloat(hand);
        if (isNaN(parsedHand) || parsedHand < 0) {
            await t.rollback();
            return res.status(400).json({ message: "Hand amount must be a valid number." });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
            await t.rollback();
            return res.status(400).json({ message: "Start date must be in YYYY-MM-DD format." });
        }
        if (!['weekly', 'every-2-weeks', 'monthly'].includes(frequency)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid frequency provided." });
        }

        const newPot = await Pot.create({
            ownerId: currUser.id,
            ownerName,
            name,
            hand: parsedHand,
            amount: 0,
            startDate,
            endDate: startDate,
            status: 'Not Started',
            frequency: frequency
        }, { transaction: t });

        await logHistory({
            userId: currUser.id,
            actionType: 'CREATE_POT',
            entityType: 'Pot',
            entityId: newPot.id,
            potIdContext: newPot.id,
            changes: { name: newPot.name, hand: newPot.hand, startDate: newPot.startDate, frequency: newPot.frequency },
            description: `User ${currUser.username} created pot "${newPot.name}".`,
            transaction: t
        });

        if (userIds && Array.isArray(userIds) && userIds.length > 0) {
            for (let i = 0; i < userIds.length; i++) {
                const userId = userIds[i];
                const userExists = await User.findByPk(userId, { transaction: t });
                if (userExists) {
                    await PotsUser.create({
                        potId: newPot.id,
                        userId: userId,
                        displayOrder: i + 1
                    }, { transaction: t });
                }
            }
            await logHistory({
                userId: currUser.id,
                actionType: 'ADD_USER_TO_POT_BULK',
                entityType: 'Pot',
                entityId: newPot.id,
                potIdContext: newPot.id,
                changes: { addedUserIds: userIds },
                description: `Added ${userIds.length} users during creation of pot "${newPot.name}".`,
                transaction: t
            });
        }

        await updatePotScheduleAndDetails(newPot.id, t);

        await t.commit();

        const finalNewPot = await Pot.findByPk(newPot.id, {
            include: [{ model: User, as: 'Users', through: { model: PotsUser, as: 'potMemberDetails', attributes: ['drawDate', 'displayOrder'] } }],
            order: [[sequelize.literal('"Users->potMemberDetails"."displayOrder"'), 'ASC']]
        });
        return res.status(201).json(finalNewPot);
    } catch (error) {
        await t.rollback();
        console.error("Error creating pot:", error);
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = error.errors.map(e => e.message);
            return res.status(400).json({ message: "Validation error", errors });
        }
        return res.status(500).json({ message: error.message || "Internal server error while creating pot." });
    }
});


router.put('/:potId', requireAuth, requirePermission(PERMISSIONS.EDIT_POT), async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;
    const numPotId = parseInt(potId);

    const t = await sequelize.transaction();
    try {
        const potToUpdate = await Pot.findByPk(numPotId, { transaction: t });
        if (!potToUpdate) {
            await t.rollback();
            return res.status(404).json({ message: "Pot not found!!" });
        }
        if (currUser.id !== potToUpdate.ownerId) {
            await t.rollback();
            return res.status(403).json({ "message": "Forbidden" });
        }

        const oldValues = { ...potToUpdate.get({ plain: true }) };
        const { name, hand, startDate, status, frequency } = req.body;
        let scheduleNeedsUpdate = false;
        const appliedChanges = {};

        const isHandChanging = hand !== undefined && potToUpdate.hand.toString() !== parseFloat(hand).toString();
        const isStartDateChanging = startDate !== undefined && potToUpdate.startDate !== startDate;
        const isFrequencyChanging = frequency !== undefined && potToUpdate.frequency !== frequency;

        if ((isHandChanging || isStartDateChanging || isFrequencyChanging) && !['Not Started', 'Paused'].includes(potToUpdate.status)) {
            await t.rollback();
            return res.status(400).json({ message: "Frequency, amount, and start date can only be changed when the pot is 'Not Started' or 'Paused'." });
        }

        if (name !== undefined && name !== oldValues.name) { potToUpdate.name = name; appliedChanges.name = { old: oldValues.name, new: name }; }
        if (status !== undefined && status !== oldValues.status) { potToUpdate.status = status; appliedChanges.status = { old: oldValues.status, new: status }; }

        if (isHandChanging) {
            const newHand = parseFloat(hand);
            if (isNaN(newHand) || newHand < 0) {
                await t.rollback();
                return res.status(400).json({ message: "Hand amount must be a positive number." });
            }
            potToUpdate.hand = newHand;
            appliedChanges.hand = { old: oldValues.hand, new: newHand };
            scheduleNeedsUpdate = true;
        }

        if (isStartDateChanging) {
            if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
                await t.rollback();
                return res.status(400).json({ message: "Start date must be in YYYY-MM-DD format." });
            }
            potToUpdate.startDate = startDate;
            appliedChanges.startDate = { old: oldValues.startDate, new: startDate };
            scheduleNeedsUpdate = true;
        }

        if (isFrequencyChanging) {
            if (!['weekly', 'every-2-weeks', 'monthly'].includes(frequency)) {
                await t.rollback();
                return res.status(400).json({ message: "Invalid frequency provided." });
            }
            potToUpdate.frequency = frequency;
            appliedChanges.frequency = { old: oldValues.frequency, new: frequency };
            scheduleNeedsUpdate = true;
        }

        if (Object.keys(appliedChanges).length > 0) {
            await potToUpdate.save({ transaction: t });
        }

        if (scheduleNeedsUpdate) {
            await updatePotScheduleAndDetails(numPotId, t);
        }

        if (Object.keys(appliedChanges).length > 0) {
            await logHistory({
                userId: currUser.id,
                actionType: 'UPDATE_POT',
                entityType: 'Pot',
                entityId: potToUpdate.id,
                potIdContext: potToUpdate.id,
                changes: appliedChanges,
                description: `User ${currUser.username} updated pot "${potToUpdate.name}".`,
                transaction: t
            });
        }

        await t.commit();

        const finalUpdatedPot = await Pot.findByPk(numPotId, {
            include: [{ model: User, as: 'Users', through: { model: PotsUser, as: 'potMemberDetails', attributes: ['drawDate', 'displayOrder'] } }],
            order: [[sequelize.literal('"Users->potMemberDetails"."displayOrder"'), 'ASC']]
        });
        return res.json(finalUpdatedPot);
    } catch (error) {
        await t.rollback();
        console.error(`Error updating pot ${potId}:`, error);
        return res.status(500).json({ message: error.message || "Internal server error." });
    }
});

// DELETE a pot by id
router.delete('/:potId', requireAuth, requirePermission(PERMISSIONS.DELETE_POT), async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;
    const numPotId = parseInt(potId);

    if (isNaN(numPotId)) {
        return res.status(400).json({ 'message': 'Invalid Pot ID.' });
    }

    const t = await sequelize.transaction();
    try {
        const potToDelete = await Pot.findByPk(numPotId, { transaction: t });

        if (!potToDelete) {
            await t.rollback();
            return res.status(404).json({ message: "Pot not found!" });
        }
        if (currUser.id !== potToDelete.ownerId) {
            await t.rollback();
            return res.status(403).json({ "message": "Forbidden, you must be the pot owner to delete it." });
        }
        if (potToDelete.status !== 'Not Started') {
            await t.rollback();
            return res.status(400).json({ message: "A pot can only be deleted if its status is 'Not Started'." });
        }

        const deletedPotInfo = {
            name: potToDelete.name,
            ownerId: potToDelete.ownerId,
            ownerName: potToDelete.ownerName,
            status: potToDelete.status,
            startDate: potToDelete.startDate,
            hand: potToDelete.hand
        };

        await potToDelete.destroy({ transaction: t });

        await logHistory({
            userId: currUser.id,
            actionType: 'DELETE_POT',
            entityType: 'Pot',
            entityId: numPotId,
            potIdContext: numPotId,
            changes: { deletedPot: deletedPotInfo },
            description: `User ${currUser.username} (ID: ${currUser.id}) deleted pot "${deletedPotInfo.name}" (ID: ${numPotId}).`,
            transaction: t
        });

        await t.commit();
        return res.status(200).json({ message: "Successfully deleted the pot." });
    } catch (error) {
        await t.rollback();
        console.error(`Error deleting pot ${potId}:`, error);
        return res.status(500).json({ message: error.message || "Internal server error while deleting the pot." });
    }
});


//add users to a pot
router.post('/:potId/addusers', requireAuth, requirePermission(PERMISSIONS.MANAGE_POT_MEMBERS), async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;
    const { userId } = req.body;
    const numPotId = parseInt(potId);
    const numUserId = parseInt(userId);


    if (isNaN(numPotId) || isNaN(numUserId)) {
        return res.status(400).json({ 'message': 'Invalid Pot ID or User ID.' });
    }

    const t = await sequelize.transaction();
    try {
        const pot = await Pot.findByPk(numPotId, { transaction: t });
        if (!pot) {
            await t.rollback();
            return res.status(404).json({ 'message': 'Pot not found.' });
        }
        if (currUser.id !== pot.ownerId) {
            return res.status(403).json({ 'message': 'Forbidden. Only the banker can add users.' });
        }
        if (pot.status !== 'Not Started' && pot.status !== 'Paused') {
            await t.rollback();
            return res.status(400).json({ message: 'Users can only be added to a pot that has not started or is paused.' });
        }
        const userToAdd = await User.findByPk(numUserId, { attributes: ['id', 'firstName', 'lastName', 'username'], transaction: t });
        if (!userToAdd) {
            await t.rollback();
            return res.status(404).json({ 'message': 'User to add not found.' });
        }
        const existingPotsUser = await PotsUser.findOne({ where: { potId: numPotId, userId: numUserId }, transaction: t });
        if (existingPotsUser) {
            await t.rollback();
            return res.status(400).json({ 'message': 'User already exists in this pot.' });
        }

        const maxOrderResult = await PotsUser.max('displayOrder', { where: { potId: numPotId }, transaction: t });
        const nextOrder = (typeof maxOrderResult === 'number' ? maxOrderResult : 0) + 1;

        await PotsUser.create({ potId: numPotId, userId: numUserId, displayOrder: nextOrder }, { transaction: t });
        const potAfterScheduleUpdate = await updatePotScheduleAndDetails(numPotId, t);

        await logHistory({
            userId: currUser.id,
            actionType: 'ADD_USER_TO_POT',
            entityType: 'PotsUser',
            entityId: numUserId,
            potIdContext: numPotId,
            changes: { userId: numUserId, username: userToAdd.username, potId: numPotId, displayOrder: nextOrder, newPotAmount: potAfterScheduleUpdate.amount, newPotEndDate: potAfterScheduleUpdate.endDate },
            description: `User ${currUser.username} (ID: ${currUser.id}) added user ${userToAdd.username} (ID: ${numUserId}) to pot "${pot.name}" (ID: ${numPotId}).`,
            transaction: t
        });

        await t.commit();
        const updatedPotResult = await Pot.findByPk(numPotId, {
            include: [{ model: User, as: 'Users', through: { model: PotsUser, as: 'potMemberDetails', attributes: ['drawDate', 'displayOrder'] } }],
            order: [

                [sequelize.literal('"Users->potMemberDetails"."displayOrder"'), 'ASC']
            ]
        });
        return res.status(201).json(updatedPotResult);
    } catch (error) {
        await t.rollback();
        console.error(`Error adding user ${userId} to pot ${potId}:`, error);
        return res.status(500).json({ message: error.message || "Internal server error." });
    }
});


//remove users from a pot
router.delete('/:potId/removeusers', requireAuth, requirePermission(PERMISSIONS.MANAGE_POT_MEMBERS), async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;
    const { userId } = req.body;
    const numPotId = parseInt(potId);
    const numUserId = parseInt(userId);


    if (isNaN(numPotId) || isNaN(numUserId)) {
        return res.status(400).json({ 'message': 'Invalid Pot ID or User ID.' });
    }

    const t = await sequelize.transaction();
    try {
        const pot = await Pot.findByPk(numPotId, { transaction: t });
        if (!pot) {
            await t.rollback();
            return res.status(404).json({ 'message': 'Pot not found.' });
        }
        if (currUser.id !== pot.ownerId) {
            return res.status(403).json({ 'message': 'Forbidden. Only the banker can remove users.' });
        }
        if (pot.status !== 'Not Started' && pot.status !== 'Paused') {
            await t.rollback();
            return res.status(400).json({ message: 'Users can only be removed from a pot that has not started or is paused.' });
        }
        const userToRemove = await User.findByPk(numUserId, { attributes: ['id', 'username'], transaction: t });
        if (!userToRemove) {
            await t.rollback();
            return res.status(404).json({ 'message': 'User to remove not found in system.' });
        }
        const potsUserEntry = await PotsUser.findOne({ where: { potId: numPotId, userId: numUserId }, transaction: t });
        if (!potsUserEntry) {
            await t.rollback();
            return res.status(404).json({ 'message': 'User not found in this pot.' });
        }

        const removedUserInfo = { userId: potsUserEntry.userId, username: userToRemove.username, oldDisplayOrder: potsUserEntry.displayOrder };
        await potsUserEntry.destroy({ transaction: t });

        const remainingMembers = await PotsUser.findAll({ where: { potId: numPotId }, order: [['displayOrder', 'ASC']], transaction: t });
        for (let i = 0; i < remainingMembers.length; i++) {
            remainingMembers[i].displayOrder = i + 1;
            await remainingMembers[i].save({ transaction: t });
        }
        const potAfterScheduleUpdate = await updatePotScheduleAndDetails(numPotId, t);

        await logHistory({
            userId: currUser.id,
            actionType: 'REMOVE_USER_FROM_POT',
            entityType: 'PotsUser',
            entityId: numUserId,
            potIdContext: numPotId,
            changes: { removedUser: removedUserInfo, newPotAmount: potAfterScheduleUpdate.amount, newPotEndDate: potAfterScheduleUpdate.endDate },
            description: `User ${currUser.username} (ID: ${currUser.id}) removed user ${removedUserInfo.username} (ID: ${numUserId}) from pot "${pot.name}" (ID: ${numPotId}).`,
            transaction: t
        });

        await t.commit();
        const updatedPotResult = await Pot.findByPk(numPotId, {
            include: [{ model: User, as: 'Users', through: { model: PotsUser, as: 'potMemberDetails', attributes: ['drawDate', 'displayOrder'] } }],
            order: [

                [sequelize.literal('"Users->potMemberDetails"."displayOrder"'), 'ASC']
            ]
        });
        return res.json(updatedPotResult);
    } catch (error) {
        await t.rollback();
        console.error(`Error removing user ${userId} from pot ${potId}:`, error);
        return res.status(500).json({ message: error.message || "Internal server error." });
    }
});


// Reorder users in a pot
router.put('/:potId/reorderusers', requireAuth, requirePermission(PERMISSIONS.MANAGE_POT_MEMBERS), async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;
    const { orderedUserIds } = req.body;
    const numPotId = parseInt(potId);

    
    if (!Array.isArray(orderedUserIds)) {
        return res.status(400).json({ message: 'orderedUserIds must be an array.' });
    }
    if (isNaN(numPotId)) {
        return res.status(400).json({ message: 'Invalid Pot ID.' });
    }

    const t = await sequelize.transaction();
    try {
        const pot = await Pot.findByPk(numPotId, { transaction: t });
        if (!pot) {
            await t.rollback();
            return res.status(404).json({ message: 'Pot not found.' });
        }
        
        if (currUser.id !== pot.ownerId) {
        return res.status(403).json({ message: 'Forbidden. Only the banker can reorder users.' });
    }
        if (pot.status !== 'Not Started' && pot.status !== 'Paused') {
            await t.rollback();
            return res.status(400).json({ message: 'Users can only be reordered in a pot that is \'Not Started\' or \'Paused\'.' });
        }

        // Correctly fetch the current members from the PotsUser table
        const currentMembers = await PotsUser.findAll({
            where: { potId: numPotId },
            order: [['displayOrder', 'ASC']],
            transaction: t
        });
        const currentMemberIds = currentMembers.map(m => m.userId);
        const oldOrderSnapshot = currentMembers.map(m => ({ userId: m.userId, displayOrder: m.displayOrder }));

        if (orderedUserIds.length !== currentMemberIds.length || !orderedUserIds.every(id => currentMemberIds.includes(parseInt(id)))) {
            await t.rollback();
            return res.status(400).json({ message: 'Invalid user list for reordering. All current members must be included exactly once and be valid numeric IDs.' });
        }

        for (let i = 0; i < orderedUserIds.length; i++) {
            const userId = parseInt(orderedUserIds[i]);
            if (isNaN(userId)) {
                await t.rollback();
                return res.status(400).json({ message: `Invalid user ID found in ordered list: ${orderedUserIds[i]}` });
            }
            const newOrder = i + 1;
            await PotsUser.update({ displayOrder: newOrder }, { where: { potId: numPotId, userId: userId }, transaction: t });
        }

        const potAfterScheduleUpdate = await updatePotScheduleAndDetails(numPotId, t);

        await logHistory({
            userId: currUser.id,
            actionType: 'REORDER_POT_USERS',
            entityType: 'Pot',
            entityId: numPotId,
            potIdContext: numPotId,
            changes: { oldOrder: oldOrderSnapshot, newOrderUserIds: orderedUserIds.map(id => parseInt(id)), newPotEndDate: potAfterScheduleUpdate.endDate },
            description: `User ${currUser.username} (ID: ${currUser.id}) reordered users in pot "${pot.name}" (ID: ${numPotId}).`,
            transaction: t
        });

        await t.commit();
        const updatedPotResult = await Pot.findByPk(numPotId, {
            include: [{ model: User, as: 'Users', through: { model: PotsUser, as: 'potMemberDetails', attributes: ['drawDate', 'displayOrder'] } }],
            order: [
                [sequelize.literal('"Users->potMemberDetails"."displayOrder"'), 'ASC']
            ]
        });
        return res.json(updatedPotResult);
    } catch (error) {
        await t.rollback();
        console.error(`Error reordering users for pot ${potId}:`, error);
        return res.status(500).json({ message: error.message || "Internal server error." });
    }
});



//get all users in a pot
router.get('/:potId/users', requireAuth, async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;

    try {
        const targetPot = await Pot.findByPk(potId, {
            include: [{
                model: User,
                as: 'Users',
                attributes: ['id', 'firstName', 'lastName', 'username', 'email', 'mobile'],
                through: {
                    model: PotsUser,
                    as: 'potMemberDetails',
                    attributes: ['displayOrder', 'drawDate']
                }
            }],
            order: [

                [sequelize.literal('"Users->potMemberDetails"."displayOrder"'), 'ASC']
            ]
        });

        if (!targetPot) {
            return res.status(404).json({ message: "Pot not found!!" });
        }

        const isMember = targetPot.Users && targetPot.Users.some(user => user.id === currUser.id);
        if (currUser.role !== 'banker' && !isMember) {
            return res.status(403).json({ "message": "Forbidden, you must be a banker or a member of this pot." });
        };

        return res.json(targetPot.Users);
    } catch (error) {
        console.error(`Error fetching users for pot ${potId}:`, error);
        return res.status(500).json({ message: "Internal server error." });
    }
});

module.exports = router;
