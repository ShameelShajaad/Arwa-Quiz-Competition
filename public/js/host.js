const socket = io({
  transports: ["websocket"],
});

const TOTAL_TIME = 10;
const RING_CIRCUMFERENCE = 276.46;

// ----------------------------
// ELEMENTS
// ----------------------------

const timerEl = document.getElementById("timer");
const ringFg = document.getElementById("ringFg");
const questionNo = document.getElementById("questionNo");
const questionText = document.getElementById("questionText");

const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const revealBtn = document.getElementById("revealBtn");

const clickSound = document.getElementById("clickSound");

nextBtn.disabled = true;
revealBtn.disabled = true;

// ----------------------------
// TIMER RING
// ----------------------------

function setRing(time) {
  const ratio = Math.max(0, Math.min(1, time / TOTAL_TIME));
  ringFg.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - ratio);
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
// BUTTONS
// ----------------------------

function playClick() {
  if (clickSound) {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  }
}

startBtn.onclick = () => {
  playClick();
  socket.emit("startTimer");

  startBtn.disabled = true;
  nextBtn.disabled = true;
  revealBtn.disabled = true;
  document.getElementById("correctAnswer").textContent = "";
};

nextBtn.onclick = () => {
  playClick();
  socket.emit("nextQuestion");
};

revealBtn.onclick = () => {
  playClick();
  socket.emit("revealAnswer");

  revealBtn.disabled = true;
  nextBtn.disabled = false;
};

// ----------------------------
// SOCKET EVENTS
// ----------------------------

socket.on("timer", (time) => {
  timerEl.textContent = time;
  setRing(time);
});

socket.on("timerFinished", () => {
  timerEl.textContent = "0";
  revealBtn.disabled = false;
  startBtn.disabled = false;
});

socket.on("teamAnswered", (data) => {
  status[data.team] = true;
  updateStatus();
});

socket.on("question", (q) => {
  questionText.textContent = q.question;
  ["ho0", "ho1", "ho2", "ho3"].forEach((id, i) => {
    document.getElementById(id).textContent = q.options[i];
  });
  document.getElementById("correctAnswer").textContent = "";
});

socket.on("questionChanged", (data) => {
  questionNo.textContent = `Question ${data.currentQuestion + 1} / ${data.totalQuestions}`;
  resetStatus();
  nextBtn.disabled = true;
  revealBtn.disabled = true;
  startBtn.disabled = false;
  timerEl.textContent = TOTAL_TIME;
  setRing(TOTAL_TIME);
  document.getElementById("correctAnswer").textContent = "";
});

socket.on("state", (game) => {
  timerEl.textContent = game.timer;
  setRing(game.timer);
  questionNo.textContent = `Question ${game.currentQuestion + 1}`;
  renderLeaderboard(game.teams);
});

socket.on("connect", () => console.log("Host Connected"));
socket.on("disconnect", () => console.log("Host Disconnected"));

socket.on("correctAnswer", (answer) => {
  document.getElementById("correctAnswer").textContent =
    "Correct Answer: " + String.fromCharCode(65 + answer);
  const optionEl = document.getElementById("ho" + answer);
  if (optionEl) optionEl.classList.add("text-correct");
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
