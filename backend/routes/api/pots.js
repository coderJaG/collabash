const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../utils/auth');
const { Pot, User, PotsUser, WeeklyPayment, sequelize } = require('../../db/models');
const { Op } = require('sequelize');

// --- HELPER FUNCTION to recalculate draw dates, pot endDate, and pot amount ---
const updatePotScheduleAndDetails = async (potId, transaction) => {
    const t = transaction;

    try {
        const pot = await Pot.findByPk(potId, { transaction: t });
        if (!pot) {
            console.error(`Pot not found with ID: ${potId} for schedule update.`);
            throw new Error('Pot not found during schedule update.');
        }

        if (!pot.startDate) {
            console.warn(`Pot ${potId} has no start date. Cannot calculate schedule.`);
            pot.amount = 0;
            pot.endDate = pot.startDate; 
            await pot.save({ transaction: t });
            return pot;
        }

        const potMembersEntries = await PotsUser.findAll({
            where: { potId: pot.id },
            order: [['displayOrder', 'ASC']],
            transaction: t
        });

        const numberOfUsers = potMembersEntries.length;
        const potStartDateString = pot.startDate; // Should be 'YYYY-MM-DD'

        let calculatedPotEndDate = potStartDateString; // Default to startDate if no users

        if (numberOfUsers > 0) {
            // Parse the potStartDateString into UTC date components
            const [startYear, startMonth, startDay] = potStartDateString.split('-').map(Number);
            // Create a Date object representing 00:00:00 UTC on the start date
            const baseDateUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay)); // month is 0-indexed

            if (isNaN(baseDateUTC.getTime())) {
                throw new Error('Invalid pot start date found for schedule calculation.');
            }

            for (let i = 0; i < numberOfUsers; i++) {
                const memberEntry = potMembersEntries[i];
                
                // Create a new Date object for each draw date calculation, starting from baseDateUTC
                const drawDateUTC = new Date(baseDateUTC.valueOf()); // Clone baseDateUTC
                // Add (i * 7) days to the UTC date
                drawDateUTC.setUTCDate(baseDateUTC.getUTCDate() + (i * 7));

                // Format the UTC drawDate to 'YYYY-MM-DD' string
                const dYear = drawDateUTC.getUTCFullYear();
                const dMonth = (drawDateUTC.getUTCMonth() + 1).toString().padStart(2, '0'); // getUTCMonth is 0-indexed
                const dDay = drawDateUTC.getUTCDate().toString().padStart(2, '0');
                memberEntry.drawDate = `${dYear}-${dMonth}-${dDay}`;
                
                await memberEntry.save({ transaction: t });

                if (i === numberOfUsers - 1) {
                    calculatedPotEndDate = memberEntry.drawDate;
                }
            }
            pot.endDate = calculatedPotEndDate;
            pot.amount = parseFloat(pot.hand) * numberOfUsers;
        } else {
            // If no users, endDate is same as startDate, amount is 0
            pot.endDate = potStartDateString; 
            pot.amount = 0;
        }

        await pot.save({ transaction: t });
        return pot;

    } catch (error) {
        console.error(`Error in updatePotScheduleAndDetails for potId ${potId}:`, error);
        throw error; // Re-throw to be caught by the route handler
    }
};


// --- ROUTES ---

//get all pots
router.get('/', requireAuth, async (req, res) => {
    const currUser = req.user;
    let potsToReturn = [];

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

    try {
        if (currUser.role === 'banker') {
            potsToReturn = await Pot.findAll({
                attributes: ['id', 'ownerId', 'ownerName', 'name', 'amount', 'startDate', 'endDate', 'status', 'hand'],
                include: [includeUsersWithDetails],
                order: [['name', 'ASC']] 
            });
        } else if (currUser.role === 'standard') {
            const userWithPots = await User.findByPk(currUser.id, {
                include: [{
                    model: Pot,
                    as: 'PotsJoined', 
                    attributes: ['id', 'ownerId', 'ownerName', 'name', 'amount', 'startDate', 'endDate', 'status', 'hand'],
                    through: { attributes: [] }, 
                    include: [includeUsersWithDetails] 
                }],
                order: [[{ model: Pot, as: 'PotsJoined' }, 'name', 'ASC']] 
            });
            potsToReturn = userWithPots && userWithPots.PotsJoined ? userWithPots.PotsJoined : [];
        } else {
            return res.status(403).json({ "message": "Forbidden: Role not authorized to view pots." });
        }

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


//get pot by id
router.get('/:potId', requireAuth, async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;
 console.log(`Deleting pot with ID: ${potId}`);
    try {
        const pot = await Pot.findByPk(potId, {
            attributes: ['id', 'ownerId', 'ownerName', 'name', 'hand', 'amount', 'startDate', 'endDate', 'status'],
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
                [sequelize.literal('`Users->potMemberDetails`.`displayOrder`'), 'ASC']
            ]
        });

        if (!pot) {
            return res.status(404).json({ "message": "Pot not found!!" });
        }

        const isMember = pot.Users && pot.Users.some(user => user.id === currUser.id);
        const isAuthorized = currUser.role === 'banker' || (currUser.role === 'standard' && isMember);

        if (!isAuthorized) {
            return res.status(403).json({ "message": "Forbidden, you must be a banker or a member of the pot." });
        }
        return res.json(pot);
    } catch (error) {
        console.error(`Error fetching pot by id ${potId}:`, error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
});


//create a pot
router.post('/', requireAuth, async (req, res) => {
    const currUser = req.user;
    if (currUser.role !== 'banker') {
        return res.status(403).json({ "message": "Forbidden, you must be a banker." });
    }
    const t = await sequelize.transaction();
    try {
        const { name, hand, startDate } = req.body;
        const ownerName = `${currUser.firstName} ${currUser.lastName}`;

        if (!name || !hand || !startDate) {
            await t.rollback();
            return res.status(400).json({ message: "Name, hand amount, and start date are required." });
        }
        const parsedHand = parseFloat(hand);
        if (isNaN(parsedHand) || parsedHand <= 0) {
            await t.rollback();
            return res.status(400).json({ message: "Hand amount must be a positive number." });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
            await t.rollback();
            return res.status(400).json({ message: "Start date must be in YYYY-MM-DD format." });
        }

        const newPot = await Pot.create({
            ownerId: currUser.id,
            ownerName,
            name,
            hand: parsedHand,
            amount: 0, 
            startDate,
            endDate: startDate, 
            status: 'Not Started'
        }, { transaction: t });

        await updatePotScheduleAndDetails(newPot.id, t);

        await t.commit();
        const finalNewPot = await Pot.findByPk(newPot.id, {
             include: [{ model: User, as: 'Users', through: { model: PotsUser, as: 'potMemberDetails', attributes: ['drawDate', 'displayOrder'] }}],
             order: [[sequelize.literal('`Users->potMemberDetails`.`displayOrder`'), 'ASC']]
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

//edit a pot by id (name, hand, startDate, status)
router.put('/:potId', requireAuth, async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;
    const numPotId = parseInt(potId);

    if (currUser.role !== 'banker') {
        return res.status(403).json({ "message": "Forbidden, you must be a banker" });
    }
    const t = await sequelize.transaction();
    try {
        const potToUpdate = await Pot.findByPk(numPotId, { transaction: t });
        if (!potToUpdate) {
            await t.rollback();
            return res.status(404).json({ message: "Pot not found!!" });
        }
        if (currUser.id !== potToUpdate.ownerId) {
            await t.rollback();
            return res.status(403).json({ "message": "Forbidden, you must be pot owner" });
        }

        const { name, hand, startDate, status } = req.body;
        let scheduleNeedsUpdate = false;

        const isHandChanging = hand !== undefined && potToUpdate.hand.toString() !== parseFloat(hand).toString();
        
        let currentStartDateStr = null;
        if (potToUpdate.startDate) { 
            currentStartDateStr = potToUpdate.startDate;
        }
        const isStartDateChanging = startDate !== undefined && currentStartDateStr !== startDate;
        
        if ((isHandChanging || isStartDateChanging) && (potToUpdate.status !== 'Not Started' && potToUpdate.status !== 'Paused')) {
            await t.rollback();
            return res.status(400).json({ message: "Amount and start date can only be changed when the pot is 'Not Started' or 'Paused'." });
        }

        if (name !== undefined) potToUpdate.name = name;
        if (status !== undefined) potToUpdate.status = status;

        if (isHandChanging) {
            const newHand = parseFloat(hand);
            if (isNaN(newHand) || newHand <= 0) {
                await t.rollback();
                return res.status(400).json({ message: "Hand amount must be a positive number." });
            }
            potToUpdate.hand = newHand;
            scheduleNeedsUpdate = true;
        }

        if (isStartDateChanging) {
            if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
                await t.rollback();
                return res.status(400).json({ message: "Start date must be in YYYY-MM-DD format." });
            }
            potToUpdate.startDate = startDate;
            scheduleNeedsUpdate = true;
        }

        await potToUpdate.save({ transaction: t });

        if (scheduleNeedsUpdate) {
            await updatePotScheduleAndDetails(numPotId, t);
        }

        await t.commit();
        const finalUpdatedPot = await Pot.findByPk(numPotId, {
            include: [{ model: User, as: 'Users', through: { model: PotsUser, as: 'potMemberDetails', attributes: ['drawDate', 'displayOrder'] } }],
            order: [[sequelize.literal('`Users->potMemberDetails`.`displayOrder`'), 'ASC']]
        });
        return res.json(finalUpdatedPot);
    } catch (error) {
        await t.rollback();
        console.error(`Error updating pot ${potId}:`, error);
        if (error.name === 'SequelizeValidationError') {
            const errors = error.errors.map(e => e.message);
            return res.status(400).json({ message: "Validation error", errors });
        }
        return res.status(500).json({ message: error.message || "Internal server error." });
    }
});

// DELETE a pot by id
router.delete('/:potId', requireAuth, async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;
    const numPotId = parseInt(potId);

    // 1. Authorization: Only bankers can delete pots
    if (currUser.role !== 'banker') {
        return res.status(403).json({ "message": "Forbidden, you must be a banker to delete a pot." });
    }

    if (isNaN(numPotId)) {
        return res.status(400).json({ 'message': 'Invalid Pot ID.' });
    }

    const t = await sequelize.transaction();

    try {
        const potToDelete = await Pot.findByPk(numPotId, { transaction: t });

        // 2. Check if pot exists
        if (!potToDelete) {
            await t.rollback();
            return res.status(404).json({ message: "Pot not found!" });
        }

        // 3. Authorization: Only the owner of the pot can delete it
        if (currUser.id !== potToDelete.ownerId) {
            await t.rollback();
            return res.status(403).json({ "message": "Forbidden, you must be the pot owner to delete it." });
        }

        // 4. Business Logic: Pot can only be deleted if it has not started
        if (potToDelete.status !== 'Not Started') {
            await t.rollback();
            return res.status(400).json({ message: "A pot can only be deleted if its status is 'Not Started'." });
        }

        // Proceed with deletion
        await potToDelete.destroy({ transaction: t });

        await t.commit();

        return res.status(200).json({ message: "Successfully deleted the pot." });

    } catch (error) {
        await t.rollback();
        console.error(`Error deleting pot ${potId}:`, error);
        return res.status(500).json({ message: error.message || "Internal server error while deleting the pot." });
    }
});

//add users to a pot
router.post('/:potId/addusers', requireAuth, async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;
    const { userId } = req.body;
    const numPotId = parseInt(potId);
    const numUserId = parseInt(userId);

    if (currUser.role !== 'banker') {
        return res.status(403).json({ 'message': 'Forbidden. Only banker can add users.' });
    }
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
        if (pot.status !== 'Not Started' && pot.status !== 'Paused') {
            await t.rollback();
            return res.status(400).json({ message: 'Users can only be added to a pot that has not started or is paused.' });
        }
        const user = await User.findByPk(numUserId, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ 'message': 'User not found.' });
        }
        const existingPotsUser = await PotsUser.findOne({ where: { potId: numPotId, userId: numUserId }, transaction: t });
        if (existingPotsUser) {
            await t.rollback();
            return res.status(400).json({ 'message': 'User already exists in this pot.' });
        }

        const maxOrderResult = await PotsUser.max('displayOrder', { where: { potId: numPotId }, transaction: t });
        const nextOrder = (typeof maxOrderResult === 'number' ? maxOrderResult : 0) + 1;

        await PotsUser.create({
            potId: numPotId,
            userId: numUserId,
            displayOrder: nextOrder
        }, { transaction: t });

        await updatePotScheduleAndDetails(numPotId, t);

        await t.commit();
        const updatedPot = await Pot.findByPk(numPotId, {
            include: [{ model: User, as: 'Users', through: { model: PotsUser, as: 'potMemberDetails', attributes: ['drawDate', 'displayOrder'] } }],
            order: [[sequelize.literal('`Users->potMemberDetails`.`displayOrder`'), 'ASC']]
        });
        return res.status(201).json(updatedPot);
    } catch (error) {
        await t.rollback();
        console.error(`Error adding user ${userId} to pot ${potId}:`, error);
        return res.status(500).json({ message: error.message || "Internal server error." });
    }
});

//remove users from a pot
router.delete('/:potId/removeusers', requireAuth, async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;
    const { userId } = req.body;
    const numPotId = parseInt(potId);
    const numUserId = parseInt(userId);

    if (currUser.role !== 'banker') {
        return res.status(403).json({ 'message': 'Forbidden. Only banker can remove users.' });
    }
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
        if (pot.status !== 'Not Started' && pot.status !== 'Paused') {
            await t.rollback();
            return res.status(400).json({ message: 'Users can only be removed from a pot that has not started.' });
        }

        const potsUserEntry = await PotsUser.findOne({ where: { potId: numPotId, userId: numUserId }, transaction: t });
        if (!potsUserEntry) {
            await t.rollback();
            return res.status(404).json({ 'message': 'User not found in this pot.' });
        }

        await potsUserEntry.destroy({ transaction: t });

        const remainingMembers = await PotsUser.findAll({
            where: { potId: numPotId },
            order: [['displayOrder', 'ASC']], 
            transaction: t
        });
        for (let i = 0; i < remainingMembers.length; i++) {
            remainingMembers[i].displayOrder = i + 1; 
            await remainingMembers[i].save({ transaction: t });
        }

        await updatePotScheduleAndDetails(numPotId, t);

        await t.commit();
        const updatedPot = await Pot.findByPk(numPotId, {
            include: [{ model: User, as: 'Users', through: { model: PotsUser, as: 'potMemberDetails', attributes: ['drawDate', 'displayOrder'] } }],
            order: [[sequelize.literal('`Users->potMemberDetails`.`displayOrder`'), 'ASC']]
        });
        return res.json(updatedPot);
    } catch (error) {
        await t.rollback();
        console.error(`Error removing user ${userId} from pot ${potId}:`, error);
        return res.status(500).json({ message: error.message || "Internal server error." });
    }
});

// New Route: Reorder users in a pot
router.put('/:potId/reorderusers', requireAuth, async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;
    const { orderedUserIds } = req.body;
    const numPotId = parseInt(potId);

    if (currUser.role !== 'banker') {
        return res.status(403).json({ message: 'Forbidden. Only bankers can reorder users.' });
    }
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
        if (pot.status !== 'Not Started' && pot.status !== 'Paused') {
            await t.rollback();
            return res.status(400).json({ message: 'Users can only be reordered in a pot that is \'Not Started\' or \'Paused\'.' });
        }

        const currentMembers = await PotsUser.findAll({ where: { potId: numPotId }, attributes: ['userId'], transaction: t });
        const currentMemberIds = currentMembers.map(m => m.userId);
        if (orderedUserIds.length !== currentMemberIds.length || !orderedUserIds.every(id => currentMemberIds.includes(parseInt(id)))) {
            await t.rollback();
            return res.status(400).json({ message: 'Invalid user list for reordering. All current members must be included exactly once.' });
        }

        for (let i = 0; i < orderedUserIds.length; i++) {
            const userId = parseInt(orderedUserIds[i]); 
            const newOrder = i + 1;
            await PotsUser.update(
                { displayOrder: newOrder },
                { where: { potId: numPotId, userId: userId }, transaction: t }
            );
        }

        await updatePotScheduleAndDetails(numPotId, t);

        await t.commit();
        const updatedPot = await Pot.findByPk(numPotId, {
            include: [{ model: User, as: 'Users', through: { model: PotsUser, as: 'potMemberDetails', attributes: ['drawDate', 'displayOrder'] } }],
            order: [[sequelize.literal('`Users->potMemberDetails`.`displayOrder`'), 'ASC']]
        });
        return res.json(updatedPot);
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
            order: [[sequelize.literal('`Users->potMemberDetails`.`displayOrder`'), 'ASC']]
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
