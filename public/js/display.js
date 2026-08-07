const socket = io({ transports: ["websocket"] });

let TOTAL_TIME = 10;
const RING_CIRCUMFERENCE = 276.46;

const timerEl = document.getElementById("timer");
const ringFg = document.getElementById("ringFg");
const questionNo = document.getElementById("questionNo");
const questionEl = document.getElementById("question");
const progressFill = document.getElementById("progressFill");
const answeredCounter = document.getElementById("answeredCounter");

function setRing(time) {
  const ratio = Math.max(0, Math.min(1, time / TOTAL_TIME));
  ringFg.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - ratio);

  const urgent = time <= 3 && time > 0;
  ringFg.classList.toggle("urgent", urgent);
  timerEl.classList.toggle("urgent", urgent);
}

function setProgress(current, total) {
  if (!total) return;
  progressFill.style.width = `${((current + 1) / total) * 100}%`;
}

function renderQuestion(q) {
  TOTAL_TIME = q.time || 10;
  questionEl.textContent = q.question;
  questionEl.classList.remove("question-in");
  void questionEl.offsetWidth;
  questionEl.classList.add("question-in");

  const labels = ["A.", "B.", "C.", "D."];
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById("o" + i);
    el.textContent = `${labels[i]} ${q.options[i]}`;
    el.classList.remove("correct");
  }
}

socket.on("connect", () => socket.emit("identify", { role: "display" }));

socket.on("question", (q) => {
  renderQuestion(q);
  answeredCounter.classList.remove("hidden");
  answeredCounter.textContent = "0 / 4 answered";
  QuizSound.questionStart();
});

socket.on("timer", (time) => {
  timerEl.textContent = time;
  setRing(time);
  if (time <= 3 && time > 0) QuizSound.tick();
});

socket.on("answeredCount", ({ count, total }) => {
  answeredCounter.textContent = `${count} / ${total} answered`;
  answeredCounter.classList.remove("hidden");
});

socket.on("correctAnswer", (correct) => {
  document.querySelectorAll(".option-btn").forEach((el) => el.classList.remove("correct"));
  const el = document.getElementById("o" + correct);
  if (el) el.classList.add("correct");
  QuizSound.reveal();
});

socket.on("questionChanged", (data) => {
  questionNo.textContent = `Question ${data.currentQuestion + 1} / ${data.totalQuestions}`;
  setProgress(data.currentQuestion, data.totalQuestions);
  questionEl.textContent = "Waiting for host to start...";
  document.querySelectorAll(".option-btn").forEach((el) => {
    el.textContent = "";
    el.classList.remove("correct");
  });
  answeredCounter.classList.add("hidden");
  TOTAL_TIME = 10;
  timerEl.textContent = TOTAL_TIME;
  setRing(TOTAL_TIME);
});

socket.on("state", (game) => {
  questionNo.textContent = `Question ${game.currentQuestion + 1} / ${game.totalQuestions}`;
  setProgress(game.currentQuestion, game.totalQuestions);

  if (game.questionStarted && game.question) {
    renderQuestion(game.question);
    answeredCounter.classList.remove("hidden");
    answeredCounter.textContent = `${game.count ?? 0} / ${game.total ?? 4} answered`;

    if (game.revealed && game.correctAnswer !== null && game.correctAnswer !== undefined) {
      const el = document.getElementById("o" + game.correctAnswer);
      if (el) el.classList.add("correct");
    }
  }

  timerEl.textContent = game.timer;
  setRing(game.timer);
});

// Projector never shows scores/leaderboard — redirect to the dedicated Winner Page instead.
let redirected = false;
socket.on("quizFinished", (winner) => {
  if (redirected) return;
  redirected = true;
  if (winner) sessionStorage.setItem("arwaWinner", JSON.stringify(winner));
  window.location.href = "winner.html";
});
