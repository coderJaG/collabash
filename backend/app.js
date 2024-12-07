const express = require('express');
require('express-async-errors');
const morgan = require('morgan');
const cors = require('cors');
const csurf = require('csurf');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const routes = require('./routes');


const { environment } = require('./config');
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



app.use(routes)


module.exports = app