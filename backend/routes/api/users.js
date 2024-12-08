const express = require('express');
const bcrypt = require('bcryptjs');

const { setTokenCookie, restoreUser } = require('../../utils/auth');
const { User } = require('../../db/models');
const { json } = require('sequelize');

const router = express.Router();

router.use(restoreUser);

router.post('/', async (req, res) => {
    const { email, username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password);
    const user = await User.create({ email, username, hashedPassword });

    const safeUser = {
        id: user.id,
        email: user.email,
        username: user.username
    }
    await setTokenCookie(res, safeUser);
    return res.json({
        user: safeUser
    })
})



module.exports = router;