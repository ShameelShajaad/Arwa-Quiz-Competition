const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const game = require("./game/gameState");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {

    console.log("Client Connected");

    // Send current state immediately
    socket.emit("state", game);

    socket.on("startTimer", () => {

        if (game.timerRunning) return;

        game.timerRunning = true;
        game.timer = 10;

        io.emit("timer", game.timer);

        game.interval = setInterval(() => {

            game.timer--;

            io.emit("timer", game.timer);

            if (game.timer <= 0) {

                clearInterval(game.interval);

                game.timerRunning = false;

                io.emit("timerFinished");

            }

        }, 1000);

    });

});

const PORT = 3000;

server.listen(PORT, () => {

    console.log("Server running on http://localhost:" + PORT);

});