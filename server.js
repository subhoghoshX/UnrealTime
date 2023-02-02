const express = require("express");
const next = require("next");
const http = require("http");
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

  io.on("connection", async (socket) => {
    async function getAllSockets() {
      const sockets = await io.fetchSockets();
      return sockets.map((socket) => socket.id);
    }
    const sockets = await getAllSockets();

    io.emit("new-user-list", sockets);

    console.log("one user connected");

    socket.on("offer-event", (arg) => {
      // console.log(arg);
      /* socket.broadcast.emit("offer-event", arg); */
      io.to(arg.receiverId).emit("offer-event", arg);
      // io.emit("custom", "some unique");
    });

    socket.on("new-ice-candidate", (arg) => {
      /* socket.broadcast.emit("new-ice-candidate", arg); */
      console.log("forwarding candidate to", arg.receiverId);
      io.to(arg.receiverId).emit("new-ice-candidate", arg);
    });

    socket.on("chat-message", (message) => {
      socket.broadcast.emit("chat-message", message);
    });

    socket.on("disconnect", async () => {
      // send down userlist again when someone disconnects
      const sockets = await getAllSockets();

      io.emit("new-user-list", sockets);
      console.log("user disconnected");
    });
  });

  server.listen(8080, "0.0.0.0");
});
