const questions = require("./data/questions.json");
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

  socket.on("joinTeam", (team) => {
    socket.team = team;

    console.log("Joined:", team);
  });

  socket.on("answer", (data) => {
    const team = game.teams.find((t) => t.id === data.team);

    if (!team) return;

    team.answer = data.answer;

    team.remainingTime = data.remainingTime;

    console.log(team);
  });

  socket.on("revealAnswer", () => {
    const correct = questions[game.currentQuestion].answer;

    game.teams.forEach((team) => {
      if (team.answer === correct) {
        team.score += 500 + team.remainingTime * 50;
      }

      team.answer = null;
    });

    io.emit("leaderboard", game.teams);
  });

  // Send current state immediately
  socket.emit("state", {
    currentQuestion: game.currentQuestion,
    timer: game.timer,
    timerRunning: game.timerRunning,
    teams: game.teams,
  });

  socket.on("startTimer", () => {
    if (game.timerRunning) return;

    console.log("Sending question...");
    console.log(questions[game.currentQuestion]);

    io.emit("question", questions[game.currentQuestion]);

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
