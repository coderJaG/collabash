const express = require('express');
const bcrypt = require('bcryptjs');
const { check } = require('express-validator');

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { User, Pot, PotsUser } = require('../../db/models');
const { handleValidationErrors } = require('../../utils/validation');

const router = express.Router();

//validate singup inputs
const validateSignupInputs = [
    check('firstName')
        .exists({ checkFalsy: true })
        .withMessage('Please enter a first name'),
    check('lastName')
        .exists({ checkFalsy: true })
        .withMessage('Please enter a last name'),
    check('mobile')
        .exists({ checkFalsy: true })
        .withMessage('Please enter a mobile number'),
    check('email')
        .exists({ checkFalsy: true })
        .isEmail()
        .withMessage('Please enter a valid email'),
    check('username')
        .exists({ checkFalsy: true })
        .isLength({ min: 4 })
        .withMessage('Please provide a username with at least 4 characters.'),
    check('username')
        .not()
        .isEmail()
        .withMessage('Username cannot be an email.'),
    check('password')
        .exists({ checkFalsy: true })
        .isLength({ min: 6 })
        .withMessage('Password must be 6 characters or more.'),
    handleValidationErrors
]



//get user by id endpoint
router.get('/:userId', requireAuth, async (req, res) => {
    const { userId } = req.params
    const currUser = req.user;
    let getUserById;

    // only banker (admin) can view  user by id
    if (currUser.role !== 'banker') {
        return res.status(403).json({
            "message": "Forbidden"
        })
    }
    if (currUser && currUser.role === 'banker') {
        getUserById = await User.findByPk(userId, {
            include: {
                model: Pot,
                attributes: ['id', 'name', 'amount'],
                through: { attributes: [] }, // exclude contents from through table
                as: 'PotsJoined'
            }
        })

        if (!getUserById) {
            return res.status(404).json({
                "message": "User couldn't be found"
            });
        }
    }
    const userData = getUserById.toJSON()
    return res.json(userData)
});



//get all users endpoint
router.get('/', requireAuth, async (req, res) => {
    const userId = req.user.id
    let getAllUsers;
    const currUser = await User.findByPk(userId);

    // only banker (admin) can view all users
    if (currUser.role !== 'banker') {
        return res.status(403).json({
            "message": "Forbidden"
        })
    }
    if (currUser && currUser.role === 'banker') {
        getAllUsers = await User.findAll()
    }

    const usersData = getAllUsers.map(users => {
        let data = users.toJSON()
        return data
    })

    return res.json({
        "Users": usersData
    })
});

//sign up a user endpoint
router.post('/', validateSignupInputs, async (req, res) => {
    const { firstName, lastName, mobile, email, drawDate, username, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password);
    const user = await User.create({ firstName, lastName, mobile, drawDate, email, username, hashedPassword, role });

    const safeUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile,
        email: user.email,
        username: user.username,
        role: user.role
    }
    await setTokenCookie(res, safeUser);
    return res.json({
        user: safeUser
    })
});

//edit a user endpoint
router.put('/:userId', validateSignupInputs, async (req, res) => {
    const currUser = req.user
    const { userId } = req.params

    if (currUser.role !== 'banker'|| currUser.id !== userId) {
        return res.status(403).json({ "message": "Forbidden, this must be your profile if you are not a banker" })
    }
    const { firstName, lastName, mobile, drawDate, email, username, password, role } = req.body;


    const getUserById = await User.findByPk(userId)
    if (!getUserById) {
        return res.status(404).json({ "message": "User not found" })
    }

    const hashedPassword = bcrypt.hashSync(password);
    const user = await getUserById.set({ firstName, lastName, mobile, drawDate, email, username, hashedPassword, role });
    await getUserById.save()

    const safeUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile,
        role: user.role
    }

    if(currUser.id === user.id){
        await setTokenCookie(res, safeUser)
    }

    return res.json({
        user: safeUser
    })
});


//delete auser by id

router.delete('/:userId', requireAuth, async (req, res) => {
    const currUser = req.user
    const {userId} =req.params


    //only banker or owner user can delete user
    if(currUser.role !== 'banker' && currUser.id !== userId){
        return res.status(403).json({'message': 'Forbidden'})
    }

    const getUserById = await User.findByPk(userId);
    if(!getUserById){
        return res.status(404).json({'message': 'User not found!'})
    }

    await getUserById.destroy();
    return res.json({'message': 'User Successfully Deleted'})
});

module.exports = router;