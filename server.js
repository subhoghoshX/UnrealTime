const express = require("express");
const next = require("next");
const http = require("node:http");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });

const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();

  //
  const server = http.createServer(app);
  const io = new Server(server);

  app.get("/test", (req, res) => {
    res.send("<h1>Hello World! - Test</h1>");
  });

  app.get("*", (req, res) => {
    return handle(req, res);
  });

  io.on("connection", (socket) => {
    console.log("one user connected");

    socket.on("offer-event", (arg) => {
      // console.log(arg);
      socket.broadcast.emit("offer-event", arg);
      // io.emit("custom", "some unique");
    });

    socket.on("new-ice-candidate", (arg) => {
      socket.broadcast.emit("new-ice-candidate", arg);
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });

  server.listen(8080, "0.0.0.0");
});
