const router = require('express').Router();

const sessionRouter = require('./session.js');
const usersRouter = require('./users.js');
const potsRouter = require('./pots.js');
const transactionsRouter = require('./transactions.js');
const historyRouter = require('./history.js');
const requestrouter = require('./requests.js');
const adminRouter = require('./admin.js');


const { restoreUser } = require('../../utils/auth.js');

// Connect restoreUser middleware to the API router
// If current user session is valid, set req.user to the user in the database
// If current user session is not valid, set req.user to null
router.use(restoreUser);

router.use('/session', sessionRouter);

router.use('/users', usersRouter);

router.use('/pots', potsRouter);

router.use('/transactions', transactionsRouter);

router.use('/history', historyRouter);

router.use('/requests', requestrouter);

router.use('/admin', adminRouter);

  
module.exports = router;