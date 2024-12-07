const express = require('express');
require('express-async-errors');
const morgan = require('morgan');
const cors = require('cors');
const csurf = require('csurf');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const routes = require('./routes');


const { environment } = require('./config');
const { ValidationError } = require('sequelize');
const { stack } = require('sequelize/lib/utils');
const isProduction = environment === 'production';
const app = express();

app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());

//Security middleware
if(!isProduction){
    app.use(cors());
};

//helmet helps set a variety of headers to better secure the app
app.use(
    helmet.crossOriginResourcePolicy({
        policy: "cross-origin"
    })
);

//Set _csurf token and create req.csurfToken method
app.use(
    csurf({
        cookie: {
            secure: isProduction,
            sameSite: isProduction && "Lax",
            httpOnly: true
        }
    })
);



app.use(routes);

// Catch unhandled requests and forward to error handler.
app.use((_req, _res, next) => {
    const err = new Error('The requested resource could not be found');
    err.title = "Resource Not Found";
    err.errors = { message: "The requested resource could not be found"};
    err.status = 404;
    next(err);
});


//sequelize error handler
app.use((err, _req, _res, next)=> {
    if( err instanceof ValidationError){
        let errors = {};
        for (let error of err.errors){
            errors[error.path] = error.message;
        }
        err.title = 'Validation error';
        err.errors = errors
    }
    next(err)
});

//format errors error handler
app.use((err, _reg, res, _next) => {
    res.status(err.status || 500);
    console.error(err);
    res.json({
        title: err.title || 'server error',
        message: err.message,
        errors: err.errors,
        stack: isProduction ? null : err.stack
    });
});

module.exports = app