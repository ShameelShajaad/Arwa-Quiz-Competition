const socket = io({ transports: ["websocket"] });

let TOTAL_TIME = 10;
const RING_CIRCUMFERENCE = 276.46;

// ----------------------------
// ELEMENTS
// ----------------------------

const timerEl = document.getElementById("timer");
const ringFg = document.getElementById("ringFg");
const questionNo = document.getElementById("questionNo");
const questionText = document.getElementById("questionText");
const progressFill = document.getElementById("progressFill");
const answeredCounter = document.getElementById("answeredCounter");
const connectionBadge = document.getElementById("connectionBadge");
const connectionText = document.getElementById("connectionText");

const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const revealBtn = document.getElementById("revealBtn");

nextBtn.disabled = true;
revealBtn.disabled = true;

// ----------------------------
// TIMER RING
// ----------------------------

function setRing(time) {
  const ratio = Math.max(0, Math.min(1, time / TOTAL_TIME));
  ringFg.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - ratio);

  const urgent = time <= 3 && time > 0;
  ringFg.classList.toggle("urgent", urgent);
  timerEl.classList.toggle("urgent", urgent);
}

setRing(TOTAL_TIME);

// ----------------------------
// TEAM STATUS
// ----------------------------

const status = { A: false, B: false, C: false, D: false };

function updateStatus() {
  document.querySelectorAll(".status-pill").forEach((pill) => {
    const team = pill.getAttribute("data-team");
    const state = pill.querySelector(".pill-state");
    if (status[team]) {
      pill.classList.add("answered");
      state.textContent = "✅ Answered";
    } else {
      pill.classList.remove("answered");
      state.textContent = "⏳ Waiting";
    }
  });
}

updateStatus();

function resetStatus() {
  status.A = status.B = status.C = status.D = false;
  updateStatus();
}

// ----------------------------
// PROGRESS BAR
// ----------------------------

function setProgress(current, total) {
  if (!total) return;
  progressFill.style.width = `${((current + 1) / total) * 100}%`;
}

// ----------------------------
// QUESTION RENDER
// ----------------------------

function renderQuestion(q) {
  TOTAL_TIME = q.time || 10;
  questionText.textContent = q.question;
  questionText.classList.remove("question-in");
  void questionText.offsetWidth;
  questionText.classList.add("question-in");

  ["ho0", "ho1", "ho2", "ho3"].forEach((id, i) => {
    document.getElementById(id).textContent = q.options[i];
    document.getElementById(id).classList.remove("text-correct");
  });
  document.getElementById("correctAnswer").textContent = "";
}

// ----------------------------
// BUTTONS
// ----------------------------

startBtn.onclick = () => {
  QuizSound.click();
  socket.emit("startTimer");

  startBtn.disabled = true;
  nextBtn.disabled = true;
  revealBtn.disabled = true;
  answeredCounter.classList.remove("hidden");
};

nextBtn.onclick = () => {
  QuizSound.click();
  socket.emit("nextQuestion");
};

revealBtn.onclick = () => {
  QuizSound.click();
  socket.emit("revealAnswer");

  revealBtn.disabled = true;
  nextBtn.disabled = false;
};

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.code === "Space" && !startBtn.disabled) {
    e.preventDefault();
    startBtn.click();
  } else if ((e.key === "r" || e.key === "R") && !revealBtn.disabled) {
    revealBtn.click();
  } else if ((e.key === "n" || e.key === "N") && !nextBtn.disabled) {
    nextBtn.click();
  }
});

// ----------------------------
// SOCKET EVENTS
// ----------------------------

socket.on("connect", () => {
  socket.emit("identify", { role: "host" });
  connectionBadge.classList.add("online");
  connectionText.textContent = "Connected";
});

socket.on("disconnect", () => {
  connectionBadge.classList.remove("online");
  connectionText.textContent = "Reconnecting…";
});

socket.on("timer", (time) => {
  timerEl.textContent = time;
  setRing(time);
  if (time <= 3 && time > 0) QuizSound.tick();
});

socket.on("timerFinished", () => {
  timerEl.textContent = "0";
  revealBtn.disabled = false;
  startBtn.disabled = false;
  QuizSound.timeUp();
});

socket.on("teamAnswered", (data) => {
  status[data.team] = true;
  updateStatus();
});

socket.on("answeredCount", ({ count, total }) => {
  answeredCounter.textContent = `${count} / ${total} answered`;
  answeredCounter.classList.remove("hidden");
});

socket.on("question", (q) => {
  renderQuestion(q);
  answeredCounter.classList.remove("hidden");
  answeredCounter.textContent = `0 / ${Object.keys(status).length} answered`;
  QuizSound.questionStart();
});

socket.on("questionChanged", (data) => {
  questionNo.textContent = `Question ${data.currentQuestion + 1} / ${data.totalQuestions}`;
  setProgress(data.currentQuestion, data.totalQuestions);
  resetStatus();
  nextBtn.disabled = true;
  revealBtn.disabled = true;
  startBtn.disabled = false;
  answeredCounter.classList.add("hidden");
  questionText.textContent = "Waiting to start the quiz...";
  ["ho0", "ho1", "ho2", "ho3"].forEach((id) => {
    document.getElementById(id).textContent = "—";
    document.getElementById(id).classList.remove("text-correct");
  });
  document.getElementById("correctAnswer").textContent = "";
  TOTAL_TIME = 10;
  timerEl.textContent = TOTAL_TIME;
  setRing(TOTAL_TIME);
});

socket.on("correctAnswer", (answer) => {
  document.getElementById("correctAnswer").textContent =
    "Correct Answer: " + String.fromCharCode(65 + answer);
  const optionEl = document.getElementById("ho" + answer);
  if (optionEl) optionEl.classList.add("text-correct");
  QuizSound.reveal();
});

socket.on("state", (game) => {
  questionNo.textContent = `Question ${game.currentQuestion + 1} / ${game.totalQuestions}`;
  setProgress(game.currentQuestion, game.totalQuestions);
  renderLeaderboard(game.teams);

  resetStatus();
  (game.answeredTeams || []).forEach((id) => (status[id] = true));
  updateStatus();

  if (game.questionStarted && game.question) {
    renderQuestion(game.question);
    answeredCounter.classList.remove("hidden");
  }

  timerEl.textContent = game.timer;
  setRing(game.timer);

  startBtn.disabled = game.timerRunning || (game.questionStarted && !game.revealed);
  revealBtn.disabled = !game.questionStarted || game.revealed || game.timerRunning;
  nextBtn.disabled = !game.revealed;
});

function renderLeaderboard(teams) {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const board = document.getElementById("miniLeaderboard");
  board.innerHTML = sorted
    .map(
      (team, i) => `
      <div class="score-row ${i === 0 ? "rank-1" : ""}">
        <span>Team ${team.id}</span>
        <span class="font-display text-gold-bright">${team.score}</span>
      </div>`
    )
    .join("");
}

socket.on("leaderboard", renderLeaderboard);
socket.on("showLeaderboard", renderLeaderboard);
