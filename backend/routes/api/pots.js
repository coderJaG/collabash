const express = require('express');

const router = express.Router();

const { requireAuth } = require('../../utils/auth');

const { Pot, User, PotsUser } = require('../../db/models');


//get all pots
router.get('/', requireAuth, async (req, res) => {
    const currUser = req.user;
    let potsToReturn = [];

    try {
        if (currUser.role === 'banker') {
            // Bankers see all pots
            const allPots = await Pot.findAll({
                attributes: ['id', 'ownerId', 'ownerName', 'name', 'amount', 'startDate', 'endDate', 'status'],
                include: [{
                    model: User,
                    as: 'Users', // Explicitly using the default alias 'Users'
                    attributes: ['id', 'firstName', 'lastName', 'username', 'email', 'mobile'], 
                    through: { attributes: [] }
                }]
            });
            potsToReturn = allPots;

        } else if (currUser.role === 'standard') {
            // Standard users see pots they are members of
            const userWithPots = await User.findByPk(currUser.id, {
                include: [{
                    model: Pot,
                    as: 'PotsJoined', // Using the alias defined in User model for its association with Pot
                    attributes: ['id', 'ownerId', 'ownerName', 'name', 'amount', 'startDate', 'endDate', 'status'],
                    through: { attributes: [] },
                    include: [{ // Nested include to get users for each of these pots
                        model: User,
                        as: 'Users', // Explicitly using the default alias 'Users'
                        attributes: ['id', 'firstName', 'lastName', 'username', 'email', 'mobile'],
                        through: { attributes: [] }
                    }]
                }]
            });
            if (userWithPots && userWithPots.PotsJoined) { // Check using the alias
                potsToReturn = userWithPots.PotsJoined;
            } else {
                potsToReturn = [];
            }
        } else {
            return res.status(403).json({ "message": "Forbidden: Role not authorized to view pots." });
        }

        if (!potsToReturn || potsToReturn.length === 0) {
            return res.json({ Pots: [] }); 
        }

        const potsData = potsToReturn.map(pot => {
            const data = pot.toJSON();
            return data;
        });

        return res.json({ Pots: potsData });

    } catch (error) {
        console.error("Error fetching pots:", error);
        // Send a more structured error
        const statusCode = error.status || 500;
        const errorMessage = error.message || "Internal server error while fetching pots.";
        return res.status(statusCode).json({ message: errorMessage, errors: error.errors });
    }
});


//get pot by id 
router.get('/:potId', requireAuth, async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;

    try {
        const getPotById = await Pot.findByPk(potId, {
            attributes: ['id', 'ownerId', 'ownerName', 'name', 'hand', 'amount', 'startDate', 'endDate', 'status'],
            include: {
                model: User,
                as: 'Users', // Explicitly using the default alias 'Users'
                attributes: ['id', 'firstName', 'lastName', 'drawDate'], // Specify needed attributes
                through: { attributes: [] }
            }
        });

        if (!getPotById) {
            return res.status(404).json({
                "message": "Pot not found!!"
            });
        };

        // Check if the found pot has Users property and if it's an array
        const potUsers = getPotById.Users || [];
        const isMember = potUsers.some(user => user.id === currUser.id);

        const isAuthorized = currUser.role === 'banker' || (currUser.role === 'standard' && isMember);

        if (!isAuthorized) {
            return res.status(403).json({ "message": "Forbidden, you must be a banker or a member of the pot." });
        };

        return res.json(getPotById);
    } catch (error) {
        console.error(`Error fetching pot by id ${potId}:`, error);
        const statusCode = error.status || 500;
        const errorMessage = error.message || "Internal server error while fetching pot details.";
        return res.status(statusCode).json({ message: errorMessage, errors: error.errors });
    }
});


//create a pot
router.post('/', requireAuth, async (req, res) => {
    const currUser = req.user;

    if (currUser.role !== 'banker') {
        return res.status(403).json({ "message": "Forbidden, you must be a banker." });
    };

    try {
        const { name, hand, amount, startDate, endDate, status } = req.body;
       
        const ownerName = `${currUser.firstName} ${currUser.lastName}`; 

        const createPot = await Pot.create({ // Changed build + save to create
            ownerId: currUser.id,
            ownerName,
            name,
            hand,
            amount,
            startDate,
            endDate,
            status: status || 'Not Started' 
        });

        return res.status(201).json(createPot); 
    } catch (error) {
        console.error("Error creating pot:", error);
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = error.errors.map(e => e.message);
            return res.status(400).json({ message: "Validation error", errors });
        }
        return res.status(500).json({ message: error.message || "Internal server error while creating pot." });
    }
});

//edit a pot by id
router.put('/:potId', requireAuth, async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;

    if (currUser.role !== 'banker') {
        return res.status(403).json({ "message": "Forbidden, you must be a banker" })
    };

    try {
        const potToUpdate = await Pot.findByPk(potId); 

        if (!potToUpdate) {
            return res.status(404).json({
                message: "Pot not found!!"
            });
        };

        if (currUser.id !== potToUpdate.ownerId) {
            return res.status(403).json({ "message": "Forbidden, you must be pot owner" })
        }

        const { name, amount, hand, startDate, endDate, status } = req.body;

        // Update fields if they are provided in the request body
        if (name !== undefined) potToUpdate.name = name;
        if (amount !== undefined) potToUpdate.amount = amount;
        if (hand !== undefined) potToUpdate.hand = hand;
        if (startDate !== undefined) potToUpdate.startDate = startDate;
        if (endDate !== undefined) potToUpdate.endDate = endDate;
        if (status !== undefined) potToUpdate.status = status;
        

        await potToUpdate.save();
        // Fetch the updated pot with its associations to return it
        const updatedPotWithAssociations = await Pot.findByPk(potId, {
            include: {
                model: User,
                as: 'Users',
                attributes: ['id', 'firstName', 'lastName', 'username', 'email', 'mobile'],
                through: { attributes: [] }
            }
        });
        return res.json(updatedPotWithAssociations);
    } catch (error) {
        console.error(`Error updating pot ${potId}:`, error);
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = error.errors.map(e => e.message);
            return res.status(400).json({ message: "Validation error", errors });
        }
        return res.status(500).json({ message: error.message || `Internal server error while updating pot ${potId}.` });
    }
});



//delete a pot by id
router.delete('/:potId', requireAuth, async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;

    if (currUser.role !== 'banker') {
        return res.status(403).json({ "message": "Forbidden, you must be a banker" });
    };

    try {
        const potToDelete = await Pot.findByPk(potId); 

        if (!potToDelete) {
            return res.status(404).json({
                message: "Pot not found!!"
            });
        };

        if (currUser.id !== potToDelete.ownerId) {
            return res.status(403).json({ "message": "Fo    rbidden, you must be pot owner" });
        }

        await potToDelete.destroy();
        return res.json({ message: "Successfully deleted" });
    } catch (error) {
        console.error(`Error deleting pot ${potId}:`, error);
        return res.status(500).json({ message: error.message || `Internal server error while deleting pot ${potId}.` });
    }
});

//add users to a pot
router.post('/:potId/addusers', requireAuth, async (req, res) => {
    const currUser = req.user;

    if (currUser.role !== 'banker') {
        return res.status(403).json({ 'message': 'Forbidden. only banker can add users' })
    }

    const { potId } = req.params;
    const { userId } = req.body;

    if (isNaN(parseInt(potId))) { 
        return res.status(400).json({ 'message': 'Invalid potId parameter' })
    }
    if (userId === undefined || isNaN(parseInt(userId))) { 
        return res.status(400).json({ 'message': 'Invalid or missing userId in request body' })
    }

    const numPotId = parseInt(potId);
    const numUserId = parseInt(userId);

    try {
        const findPot = await Pot.findByPk(numPotId);
        if (!findPot) {
            return res.status(404).json({ 'message': 'Pot not found' })
        }

        const findUser = await User.findByPk(numUserId);
        if (!findUser) {
            return res.status(404).json({ 'message': 'User not found' })
        }

        const findUserInPot = await PotsUser.findOne({
            where: { potId: numPotId, userId: numUserId }
        });
        if (findUserInPot) {
            return res.status(400).json({ 'message': 'User already exists in this pot' })
        }

        const addPotUser = await PotsUser.create({ 
            potId: numPotId,
            userId: numUserId
        });

        return res.status(201).json(addPotUser); 
    } catch (error) {
        console.error(`Error adding user ${userId} to pot ${potId}:`, error);
        return res.status(500).json({ message: error.message || `Internal server error while adding user to pot.` });
    }
});


//remove users from a pot
router.delete('/:potId/removeusers', requireAuth, async (req, res) => {
    const currUser = req.user;

    if (currUser.role !== 'banker') {
        return res.status(403).json({ 'message': 'Forbidden. only banker can remove users' })
    }

    const { potId } = req.params;
    const { userId } = req.body;

    if (isNaN(parseInt(potId))) {
        return res.status(400).json({ 'message': 'Invalid potId' })
    }
     if (userId === undefined || isNaN(parseInt(userId))) {
        return res.status(400).json({ 'message': 'Invalid or missing userId' })
    }

    const numPotId = parseInt(potId);
    const numUserId = parseInt(userId);

    try {
        const findPot = await Pot.findByPk(numPotId); 
        if (!findPot) {
            return res.status(404).json({ 'message': 'Pot not found' })
        }

        const findUserInPot = await PotsUser.findOne({
            where: { potId: numPotId, userId: numUserId }
        });

        if (!findUserInPot) {
            return res.status(404).json({ 'message': 'User does not exist in this pot' })
        };

        await findUserInPot.destroy();
        return res.json({ message: "User removed successfully from pot" });
    } catch (error) {
        console.error(`Error removing user ${userId} from pot ${potId}:`, error);
        return res.status(500).json({ message: error.message || `Internal server error while removing user from pot.` });
    }
});


//get all users in a pot
router.get('/:potId/users', requireAuth, async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;

    // Allow banker or a member of the pot to see users of that pot
    const targetPot = await Pot.findByPk(potId, {
        include: [{ model: User, as: 'Users', through: { attributes: [] } }]
    });

    if (!targetPot) {
        return res.status(404).json({ message: "Pot not found!!" });
    }

    const isMember = targetPot.Users.some(user => user.id === currUser.id);
    if (currUser.role !== 'banker' && !isMember) {
        return res.status(403).json({ "message": "Forbidden, you must be a banker or a member of this pot." });
    };

    // Re-fetch just the users for the pot to return,
    // To be consistent and only return user data as per PotsUser join:
    const usersInPot = await User.findAll({
        include: [{
            model: Pot,
            as: 'PotsJoined',
            where: { id: potId },
            attributes: [], 
            through: { attributes: [] }
        }],
        attributes: ['id', 'firstName', 'lastName', 'username', 'email', 'mobile'] 
    });

    return res.json(usersInPot);
});





module.exports = router;