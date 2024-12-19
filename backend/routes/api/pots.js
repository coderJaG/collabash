const express = require('express');

const router = express.Router();

const { requireAuth } = require('../../utils/auth');

const { Pot, User } = require('../../db/models');
const { Model } = require('sequelize');
const { get } = require('./users');





//get all pots
router.get('/', requireAuth, async (req, res) => {
    const currUser = req.user;

    if (currUser.role !== 'banker') {
        return res.json({ "message": "Forbidden, you must be a banker" });
    };


    const getAllPots = await Pot.findAll({
        attributes: ['id', 'ownerId', 'name', 'amount']
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

    if (currUser.role !== 'banker') {
        return res.status(403).json({ "message": "Forbidden, you must be a banker" });
    };

    const getPotById = await Pot.findByPk(potId, {
        attributes: ['id', 'ownerId', 'name', 'amount'],
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


    return res.json(getPotById);
});

//edit a pot by id
router.put('/:potId', requireAuth, async (req, res) => {

    const currUser = req.user;
    const { potId } = req.params;

    if (currUser.role !== 'banker') {
        return res.status(403).json({ "message": "Forbidden, you must be a banker" })
    };

    const getPotById = await Pot.findByPk(potId, {
        attributes: ['id', 'ownerId', 'name', 'amount'],
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
        return res.json({ "message": "Forbidden, you must bepot owner" })
    } else {
        const { name, amount } = req.body
        getPotById.set({
            name,
            amount
        });

        await getPotById.save();
        return res.json(getPotById);
    };

});

//create a pot
router.post('/', requireAuth, async (req, res) => {
    const currUser = req.user;

    if (currUser.role !== 'banker') {
        return res.status(403).json({ "message": "Forbidden, you must be a banker" });
    };

    const { name, amount } = req.body
    const ownerId = currUser.id
    const createPot = await Pot.build({
        ownerId,
        name,
        amount
    });

    await createPot.save();
    return res.json(createPot);
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
        return res.json({ "message": "Forbidden, you must be pot owner" });
    } else {

        await getPotById.destroy();

        return res.json({ message: "success" });
    };
});






module.exports = router;