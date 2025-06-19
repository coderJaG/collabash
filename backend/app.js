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

const isProduction = environment === 'production';
const app = express();

// --- Socket.io Integration: Start ---
const http = require('http');
const { Server } = require("socket.io");
const server = http.createServer(app); // Create an HTTP server from the Express app
const io = new Server(server, {
  cors: {
    // this origin matches frontend's URL
    origin: isProduction ? "https://collabash-test.onrender.com" : "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// This object will temporarily store the mapping of userId to socket.id
// may use Redis or another store in future.
const connectedUsers = {};

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // When a user logs in, the frontend should emit this event
  socket.on('join', (userId) => {
    console.log(`User ${userId} has joined the notification room.`);
    connectedUsers[userId] = socket.id; // Associate userId with their socket.id
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    // Clean up the disconnected user
    for (const userId in connectedUsers) {
      if (connectedUsers[userId] === socket.id) {
        delete connectedUsers[userId];
        break;
      }
    }
  });
});

// Middleware to attach the socket.io instance to every request object
app.use((req, res, next) => {
    req.io = io;
    req.connectedUsers = connectedUsers;
    next();
});
// --- Socket.io Integration: End ---

app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());

// Security middleware
if (!isProduction) {
    app.use(cors());
}

app.use(
    helmet.crossOriginResourcePolicy({
        policy: "cross-origin"
    })
);

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
    err.errors = { message: "The requested resource could not be found" };
    err.status = 404;
    next(err);
});


// Sequelize error handler
app.use((err, _req, _res, next) => {
    if (err instanceof ValidationError) {
        let errors = {};
        for (let error of err.errors) {
            errors[error.path] = error.message;
        }
        err.title = 'Validation error';
        err.errors = errors;
    }
    next(err);
});

// Format errors error handler
app.use((err, _reg, res, _next) => {
    res.status(err.status || 500);
    console.error(err);
    res.json({
        title: err.title || 'Server Error',
        message: err.message,
        errors: err.errors,
        stack: isProduction ? null : err.stack
    });
});

module.exports = server;