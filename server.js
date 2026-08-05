const questions = require("./data/questions.json");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const game = require("./game/gameState");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  transports: ["websocket"],
});

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log(
    "Client Connected:",
    socket.id,
    socket.handshake.headers["user-agent"],
  );

  console.log("Client Connected");

  socket.on("disconnect", (reason) => {
    console.log("Disconnected:", socket.id, reason);
  });

  socket.on("joinTeam", (team) => {
    socket.team = team;

    console.log("Joined:", team);
  });

  socket.on("answer", (data) => {
    const team = game.teams.find((t) => t.id === data.team);

    if (!team) return;

    team.answer = data.answer;

    io.emit("teamAnswered", {
      team: data.team,
    });

    team.remainingTime = data.remainingTime;

    console.log(team);
  });

  socket.on("revealAnswer", () => {
    console.log("Reveal button pressed");

    const correctAnswer = questions[game.currentQuestion].answer;

    game.teams.forEach((team) => {
      if (team.answer === correctAnswer) {
        const points = 500 + team.remainingTime * 50;

        team.score += points;

        console.log(`✅ Team ${team.id} +${points}`);
      } else {
        console.log(`❌ Team ${team.id} Wrong`);
      }

      team.answer = null;
      team.remainingTime = 0;
    });

    io.emit("leaderboard", game.teams);

    io.emit("correctAnswer", correctAnswer);
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
  socket.on("nextQuestion", () => {
    if (game.currentQuestion >= questions.length - 1) {
      io.emit("quizFinished");
      return;
    }

    game.currentQuestion++;

    game.teams.forEach((team) => {
      team.answer = null;
      team.remainingTime = 0;
    });

    io.emit("questionChanged", {
      currentQuestion: game.currentQuestion + 1,
      totalQuestions: questions.length,
    });

    if (game.currentQuestion >= questions.length - 1) {
      game.teams.sort((a, b) => b.score - a.score);

      io.emit("quizFinished", game.teams[0]);

      return;
    }
  });

  socket.on("timerFinished", () => {
    document
      .querySelectorAll(".answer")
      .forEach((btn) => (btn.disabled = true));
  });
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
