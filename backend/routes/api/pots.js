const express = require('express');

const router = express.Router();

const { requireAuth } = require('../../utils/auth');

const { Pot, User, PotsUser } = require('../../db/models');
const { where } = require('sequelize');


//get all pots
router.get('/', requireAuth, async (req, res) => {
    const currUser = req.user;

    if (currUser.role !== 'banker') {
        return res.status(403).json({ "message": "Forbidden, you must be a banker." });
    };

    console.log('got to here')
    const getAllPots = await Pot.findAll({
        attributes: ['id', 'ownerId', 'ownerName', 'name', 'amount', 'startDate', 'endDate', 'status',],
        include: {
            model: User,
            through: { attributes: [] }
        }
    });
    if (!getAllPots) {
        return res.json({
            message: "No Pots found!!"
        });
    };

    const potsData = getAllPots.map(pot => {
        data = pot.toJSON();
        return data;
    });

    return res.json({ Pots: potsData });
});


//get pot by id 
router.get('/:potId', requireAuth, async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;

    const getPotById = await Pot.findByPk(potId, {
        attributes: ['id', 'ownerId', 'ownerName', 'name', 'hand', 'amount', 'startDate', 'endDate', 'status'],
        include: {
            model: User,
            through: { attributes: [] }
        }
    });

    if (!getPotById) {
        return res.status(404).json({
            "message": "Pot not found!!"
        });
    };

    const isAuthorized = currUser.role === 'banker' ||
        (currUser.role === 'standard' && getPotById.Users.some(user => user.id === currUser.id))

    if (!isAuthorized) {
        return res.status(403).json({ "message": "Forbidden, you must be a banker or a member of the pot." });
    };

    return res.json(getPotById);
});


//create a pot
router.post('/', requireAuth, async (req, res) => {
    const currUser = req.user;

    if (currUser.role !== 'banker') {
        return res.status(403).json({ "message": "Forbidden, you must be a banker." });
    };

    const { name, hand, amount, startDate, endDate, status } = req.body
    const ownerId = currUser.id
    const ownerName = `${currUser.firstName} ${currUser.lastname}`
    const createPot = await Pot.build({
        ownerId,
        ownerName,
        name,
        hand,
        amount,
        startDate,
        endDate,
        status
    });

    await createPot.save();
    return res.json(createPot);
});

//edit a pot by id
router.put('/:potId', requireAuth, async (req, res) => {

    const currUser = req.user;
    const { potId } = req.params;


    if (currUser.role !== 'banker') {
        return res.status(403).json({ "message": "Forbidden, you must be a banker" })
    };

    const getPotById = await Pot.findByPk(potId, {
        attributes: ['id', 'ownerId', 'ownerName', 'name', 'hand', 'amount', 'startDate', 'endDate', 'status'],
        include: {
            model: User,
            through: { attributes: [] }
        }
    });

    if (!getPotById) {
        return res.status(404).json({
            message: "Pot not found!!"
        });
    };

    //check if current user owns pot
    if (currUser.id !== getPotById.ownerId) {
        return res.status(403).json({ "message": "Forbidden, you must bepot owner" })
    } else {
        const { name, amount, hand, startDate, endDate, status } = req.body;

        //for partial updates eg. status change
        if (name !== undefined) getPotById.name = name;
        if (amount !== undefined) getPotById.amount = amount;
        if (hand !== undefined) getPotById.hand = hand;
        if (startDate !== undefined) getPotById.startDate = startDate;
        if (endDate !== undefined) getPotById.endDate = endDate;
        if (status !== undefined) getPotById.status = status;

        getPotById.set({
            name,
            hand,
            amount,
            startDate,
            endDate,
            status
        });

        await getPotById.save();
        return res.json(getPotById);
    };

});



//delete a pot by id
router.delete('/:potId', requireAuth, async (req, res) => {

    const currUser = req.user;
    const { potId } = req.params;

    if (currUser.role !== 'banker') {
        return res.status(403).json({ "message": "Forbidden, you must be a banker" });
    };

    const getPotById = await Pot.findByPk(potId);

    if (!getPotById) {
        return res.status(404).json({
            message: "Pot not found!!"
        });
    };

    if (currUser.id !== getPotById.ownerId) {
        return res.status(403).json({ "message": "Forbidden, you must be pot owner" });
    } else {

        await getPotById.destroy();

        return res.json({ message: "success" });
    };
});

//add users to a pot
router.post('/:potId/addusers', requireAuth, async (req, res) => {
    const currUser = req.user;
    //check if user is banker
    console.log('tis block got hit)')
    if (currUser.role !== 'banker') {
        return res.status(403).json({ 'message': 'Forbidden. only banker can add users' })
    }

    console.log('tis block got hit here)')
    const { potId } = req.params;
    const { userId } = req.body;
    //check if potId is a number    
    if (isNaN(potId)) {
        return res.status(400).json({ 'message': 'Invalid potId' })
    }
    //check if pot exist
    const findPot = await Pot.findByPk(potId);
    if (!findPot) {
        return res.status(404).json({ 'message': 'Pot not found' })
    }
    //check if user exist
    const findUser = await User.findByPk(userId);
    if (!findUser) {
        return res.status(404).json({ 'message': 'User not found' })
    }
    
    //check if user already exist in pot to prevent duplicates
    const findUserInPot = await PotsUser.findOne({
        where: {
            potId: Number(potId),
            userId
        }
    });
    if (findUserInPot) {
        return res.status(403).json({ 'message': 'User already exists, add a new user' })
    }


    const addPotUser = await PotsUser.build({
        potId: Number(potId),
        userId
    });

    await addPotUser.save();

    return res.json(addPotUser)
});


//remove users from a pot
router.delete('/:potId/removeusers', requireAuth, async (req, res) => {
    const currUser = req.user;

    if (currUser.role !== 'banker') {
        return res.status(403).json({ 'message': 'Forbidden. only banker can remove users' })
    }

    const { potId } = req.params;
    const { userId } = req.body;

    //check if pot exist
    const findPot = await Pot.findByPk(potId);
    if (!findPot) {
        return res.status(404).json({ 'message': 'Pot not found' })
    }

    //check if user exist
    const findUser = await User.findByPk(userId);
    if (!findUser) {
        return res.status(404).json({ 'message': 'User not found' })
    }

    //check if user exist in pot 
    const findUserInPot = await PotsUser.findOne({
        where: {
            potId: Number(potId),
            userId
        }
    });

    if (!findUserInPot) {
        return res.status(404).json({ 'message': 'User does not exist in pot' })
    };

    await findUser.destroy();

    return res.json({ message: "success" });
});


//get all users in a pot
router.get('/:potId/users', requireAuth, async (req, res) => {
    const currUser = req.user;
    const { potId } = req.params;

    if (currUser.role !== 'banker') {
        return res.status(403).json({ "message": "Forbidden, you must be a banker." });
    };

    const getAllUsersInPot = await PotsUser.findAll({
        where: {
            potId
        }
    });

    if (!getAllUsersInPot) {
        return res.status(404).json({
            message: "Pot not found!!"
        });
    };

    return res.json(getAllUsersInPot);
});
//get all pots by user id
// router.get('/user/:userId', requireAuth, async (req, res) => {
//     const currUser = req.user;
//     const { userId } = req.params;

//     if (currUser.role !== 'banker') {
//         return res.status(403).json({ "message": "Forbidden, you must be a banker." });
//     };

//     const getAllPotsByUserId = await User.findByPk(userId, {
//         include: {
//             model: Pot,
//             through: { attributes: [] }
//         }
//     });

//     if (!getAllPotsByUserId) {
//         return res.status(404).json({
//             message: "User not found!!"
//         });
//     };

//     return res.json(getAllPotsByUserId);
// });





module.exports = router;