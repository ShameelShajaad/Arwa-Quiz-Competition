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

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

// Never send the correct-answer index to clients before it's revealed —
// otherwise anyone can read it straight out of dev tools / network tab.
function sanitizeQuestion(q) {
  if (!q) return null;
  return {
    id: q.id,
    question: q.question,
    options: q.options,
    time: q.time || 10,
  };
}

function answeredCountPayload() {
  return {
    count: game.teams.filter((t) => t.answer !== null).length,
    total: game.teams.length,
  };
}

// Sends a role-appropriate snapshot to a single (re)connecting socket.
// Host gets scores; team/display never do — enforced here, not just in the UI.
function sendState(socket) {
  const q = questions[game.currentQuestion];

  const base = {
    currentQuestion: game.currentQuestion,
    totalQuestions: questions.length,
    timer: game.timer,
    timerRunning: game.timerRunning,
    questionStarted: game.questionStarted,
    revealed: game.revealed,
    question: game.questionStarted ? sanitizeQuestion(q) : null,
  };

  if (socket.role === "host") {
    socket.emit("state", {
      ...base,
      teams: game.teams,
      answeredTeams: game.teams.filter((t) => t.answer !== null).map((t) => t.id),
    });
    return;
  }

  if (socket.role === "team") {
    const teamData = game.teams.find((t) => t.id === socket.team);
    socket.emit("state", {
      ...base,
      myAnswer: teamData ? teamData.answer : null,
      myLastAnswer: teamData ? teamData.lastAnswer : null,
      correctAnswer: game.revealed ? q.answer : null,
    });
    return;
  }

  // display (or unidentified) — aggregate info only, never scores
  socket.emit("state", {
    ...base,
    ...answeredCountPayload(),
    correctAnswer: game.revealed ? q.answer : null,
  });
}

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });

  // A client announces who it is right after connecting. This lets the
  // server put it in the right Socket.IO room and scope data correctly —
  // scores never even leave the server for team/display sockets.
  socket.on("identify", (payload = {}) => {
    const { role, team } = payload;
    socket.role = role;

    if (role === "host") socket.join("host");
    if (role === "display") socket.join("display");
    if (role === "team") {
      socket.team = team;
      socket.join("team");
    }

    sendState(socket);
  });

  socket.on("joinTeam", (team) => {
    socket.team = team;
    console.log("Joined:", team);
  });

  socket.on("answer", (data) => {
    const team = game.teams.find((t) => t.id === data.team);
    if (!team) return;

    // Guard against duplicate/late submissions (e.g. replayed via dev tools)
    if (team.answer !== null) return;
    if (!game.timerRunning) return;

    team.answer = data.answer;
    team.remainingTime = data.remainingTime;

    io.emit("teamAnswered", { team: data.team });
    io.emit("answeredCount", answeredCountPayload());
  });

  socket.on("revealAnswer", () => {
    const q = questions[game.currentQuestion];
    const correctAnswer = q.answer;

    game.teams.forEach((team) => {
      if (team.answer === correctAnswer) {
        const points = 500 + team.remainingTime * 50;
        team.score += points;
      }
      team.lastAnswer = team.answer;
      team.answer = null;
      team.remainingTime = 0;
    });

    game.revealed = true;

    io.to("host").emit("leaderboard", game.teams);
    io.emit("correctAnswer", correctAnswer);

    setTimeout(() => {
      io.to("host").emit("showLeaderboard", game.teams);
    }, 5000);
  });

  socket.on("startTimer", () => {
    if (game.timerRunning) return;

    const q = questions[game.currentQuestion];
    game.questionStarted = true;
    game.revealed = false;

    io.emit("question", sanitizeQuestion(q));

    game.timerRunning = true;
    game.timer = q.time || 10;

    io.emit("timer", game.timer);
    io.emit("answeredCount", answeredCountPayload());

    clearInterval(game.interval);
    game.interval = setInterval(() => {
      game.timer--;
      io.emit("timer", game.timer);

      if (game.timer <= 0) {
        clearInterval(game.interval);
        game.timerRunning = false;
        game.timer = 0;

        io.emit("timer", 0);
        io.emit("timerFinished");
      }
    }, 1000);
  });

  socket.on("nextQuestion", () => {
    if (game.currentQuestion >= questions.length - 1) {
      game.teams.sort((a, b) => b.score - a.score);
      io.emit("quizFinished", game.teams[0]);
      return;
    }

    game.currentQuestion++;
    game.questionStarted = false;
    game.revealed = false;

    game.teams.forEach((team) => {
      team.answer = null;
      team.lastAnswer = null;
      team.remainingTime = 0;
    });

    io.emit("questionChanged", {
      currentQuestion: game.currentQuestion,
      totalQuestions: questions.length,
    });

    const nextQ = questions[game.currentQuestion];
    game.timer = nextQ.time || 10;
    io.emit("timer", game.timer);
    io.emit("answeredCount", answeredCountPayload());
  });
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
