import express from 'express';
// import createError from 'http-errors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import socket_io from 'socket.io';
import jwt from 'jsonwebtoken';
import path from 'path';
import logger from 'morgan';
import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: ".env" });
// const createError = require("http-errors");
// const express = require("express");
// const rateLimit = require("express-rate-limit");
// const helmet = require("helmet");
// const socket_io = require("socket.io");
// const jwt = require("jsonwebtoken");
// const path = require("path");
// const logger = require("morgan");
// const mongoose = require("mongoose");
// const fs = require("fs");
// require("dotenv").config({ path: ".env" });

// connect to DB
const dbHost = process.env.DB_HOST || 'labul.inouiagency.com';
const dbPort = process.env.DB_PORT || 27111;
const dbName = process.env.DB_NAME || 'labul_db';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || 'SM25pQ9jAYj77WC46dwtHKK4';
const dbCred = dbUser.length > 0 || dbPass.length > 0 ? `${dbUser}:${dbPass}@` : '';
const dbUrl = process.env.DB_URL || `mongodb://${dbCred}localhost:${dbPort}/${dbName}?authSource=admin`;
// const dbUrl = process.env.DB_URL || `mongodb://localhost:27017/${dbName}`;
console.log(dbUrl)
mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.Promise = global.Promise; // Tell Mongoose to use ES6 promises
mongoose.connection.on("error", (err) => {
  console.error(err.message);
});

mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("autoIndex", false);

import "./models/Demand.js"
import "./models/User.js"
import "./models/ChatRoom.js"
import "./models/Message.js"
import "./models/Notification.js"

const app = express();
const io = socket_io();

// const userController = require("./controllers/userController");

app.io = io;

app.set("socketio", io);

io.use((socket, next) => {
  if (socket.handshake.query && socket.handshake.query.token) {
    const token = socket.handshake.query.token.split(" ")[1];
    jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
      if (err) return next(new Error("Authentication error"));
      socket.userData = decoded;
      next();
    });
  } else {
    next(new Error("Authentication error"));
  }
}).on("connection", (socket) => {
  // Connection now authenticated to receive further events
  socket.join(socket.userData.userId);
  io.in(socket.userData.userId).clients((err, clients) => {
    userController.changeStatus(socket.userData.userId, clients, io);
    //console.log(clients);
  });
  socket.on("typing", (data) => {
    socket.to(data.userId).emit("typing", { roomId: data.roomId });
  });
  socket.on("stoppedTyping", (data) => {
    socket.to(data.userId).emit("stoppedTyping", { roomId: data.roomId });
  });
  socket.on("disconnect", () => {
    socket.leave(socket.userData.userId);
    io.in(socket.userData.userId).clients((err, clients) => {
      userController.changeStatus(socket.userData.userId, clients, io);
      //console.log(clients);
    });
  });
});

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 1000, // limit each IP to 200 requests per windowMs
});
import apiRouter from './routes/index.js'
app.use(helmet());
if (process.env.NODE_ENV === "production") {
  app.use(limiter);
  app.use(
    logger("common", {
      stream: fs.createWriteStream("./access.log", { flags: "a" }),
    })
  );
} else {
  app.use(logger("dev"));
}
app.use(express.static("public"));
// app.get("*", (req, res) => {
//   res.sendFile(path.resolve(__dirname, "public"));
// });


app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/", apiRouter);

app.get("/auth/reset/password/:jwt", function (req, res) {
  return res.status(404).json({ message: "go to port 3000" });
});

const __dirname = path.resolve(path.dirname(''));
var dir = path.join(__dirname);
var mime = {
    html: 'text/html',
    txt: 'text/plain',
    css: 'text/css',
    gif: 'image/gif',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    apk: 'application/apk',
    js: 'application/javascript'
};

app.get('*', function (req, res) {
    var file = path.join(dir, req.path.replace(/\/$/, '/index.html'));
    if (file.indexOf(dir + path.sep) !== 0) {
        return res.status(403).end('Forbidden');
    }
    var type = mime[path.extname(file).slice(1)] || 'text/plain';
    var s = fs.createReadStream(file);
    s.on('open', function () {
        res.set('Content-Type', type);
        s.pipe(res);
    });
    s.on('error', function () {
        res.set('Content-Type', 'text/plain');
        res.status(404).end('Not found');
    });
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});
// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  // res.locals.message = err.message;
  // res.locals.error = process.env.NODE_ENV === "development" ? err : {};
  console.log(err);

  // render the error page
  res.status(err.status || 500);
  res.json({
      message: err.message,
  });
});
export default app
// module.exports = app;
