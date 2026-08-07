const socket = io({
  transports: ["websocket"],
});

const TOTAL_TIME = 10;
const RING_CIRCUMFERENCE = 276.46;

const timerEl = document.getElementById("timer");
const ringFg = document.getElementById("ringFg");

function setRing(time) {
  const ratio = Math.max(0, Math.min(1, time / TOTAL_TIME));
  ringFg.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - ratio);
}

socket.on("question", (q) => {
  document.getElementById("questionNo").textContent = `Question`;
  document.getElementById("question").textContent = q.question;

  const labels = ["A.", "B.", "C.", "D."];
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById("o" + i);
    el.textContent = `${labels[i]} ${q.options[i]}`;
    el.classList.remove("correct");
  }
});

socket.on("timer", (time) => {
  timerEl.textContent = time;
  setRing(time);
});

socket.on("correctAnswer", (correct) => {
  document.querySelectorAll(".option-btn").forEach((el) => el.classList.remove("correct"));
  const el = document.getElementById("o" + correct);
  if (el) el.classList.add("correct");
});

socket.on("questionChanged", (data) => {
  document.getElementById("questionNo").textContent = `Question ${data.currentQuestion + 1} / ${data.totalQuestions}`;
  document.querySelectorAll(".option-btn").forEach((el) => el.classList.remove("correct"));
  timerEl.textContent = TOTAL_TIME;
  setRing(TOTAL_TIME);
});

socket.on("state", (game) => {
  document.getElementById("questionNo").textContent = `Question ${game.currentQuestion + 1}`;
  timerEl.textContent = game.timer;
  setRing(game.timer);
});

// Projector never shows scores/leaderboard — redirect to the dedicated Winner Page instead.
socket.on("quizFinished", (winner) => {
  if (winner) {
    sessionStorage.setItem("arwaWinner", JSON.stringify(winner));
  }
  window.location.href = "winner.html";
});

socket.on("connect", () => console.log("Display Connected"));
socket.on("disconnect", () => console.log("Display Disconnected"));
