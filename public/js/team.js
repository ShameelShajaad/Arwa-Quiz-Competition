const socket = io({ transports: ["websocket"] });

let TOTAL_TIME = 10;
const RING_CIRCUMFERENCE = 276.46;

const params = new URLSearchParams(window.location.search);
const team = params.get("team") || "";

const timerEl = document.getElementById("timer");
const ringFg = document.getElementById("ringFg");
const answeredNote = document.getElementById("answeredNote");
const progressFill = document.getElementById("progressFill");
const connectionBadge = document.getElementById("connectionBadge");
const connectionText = document.getElementById("connectionText");
const questionNo = document.getElementById("questionNo");
const questionEl = document.getElementById("question");

document.getElementById("teamName").textContent = team ? "TEAM " + team : "SELECT TEAM";

let answered = false;

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

function renderOptions(q) {
  TOTAL_TIME = q.time || 10;

  questionEl.textContent = q.question;
  questionEl.classList.remove("question-in");
  void questionEl.offsetWidth;
  questionEl.classList.add("question-in");

  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById("a" + i);
    btn.textContent = q.options[i];
    btn.disabled = false;
    btn.classList.remove("selected", "correct", "wrong");
    attachHandler(btn, i);
  }
}

function attachHandler(btn, i) {
  btn.onclick = () => {
    if (!team) {
      alert("Please join a team first.");
      return;
    }
    if (answered) return;

    answered = true;
    QuizSound.click();

    socket.emit("answer", {
      team,
      answer: i,
      remainingTime: Number(timerEl.textContent),
    });

    document.querySelectorAll(".option-btn").forEach((b) => (b.disabled = true));
    btn.classList.add("selected");
    answeredNote.classList.remove("hidden");
  };
}

// ---------- IDENTIFY / CONNECTION ----------
socket.on("connect", () => {
  socket.emit("identify", { role: "team", team });
  if (team) socket.emit("joinTeam", team);
  connectionBadge.classList.add("online");
  connectionText.textContent = "Connected";
});

socket.on("disconnect", () => {
  connectionBadge.classList.remove("online");
  connectionText.textContent = "Reconnecting…";
});

// ---------- TIMER ----------
socket.on("timer", (time) => {
  timerEl.textContent = time;
  setRing(time);
  if (time <= 3 && time > 0) QuizSound.tick();
});

// ---------- QUESTION ----------
socket.on("question", (q) => {
  answered = false;
  answeredNote.classList.add("hidden");
  renderOptions(q);
  QuizSound.questionStart();
});

// ---------- REVEAL ----------
socket.on("correctAnswer", (correct) => {
  let gotItRight = false;

  document.querySelectorAll(".option-btn").forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct) {
      btn.classList.add("correct");
      btn.classList.remove("wrong");
      if (btn.classList.contains("selected")) gotItRight = true;
    } else if (btn.classList.contains("selected")) {
      btn.classList.add("wrong");
    }
  });

  if (answered) {
    if (gotItRight) QuizSound.correct();
    else QuizSound.wrong();
  }
});

// ---------- NEXT QUESTION ----------
socket.on("questionChanged", (data) => {
  questionNo.textContent = `Question ${data.currentQuestion + 1}`;
  setProgress(data.currentQuestion, data.totalQuestions);
  questionEl.textContent = "Waiting for Host...";
  answeredNote.classList.add("hidden");
  answered = false;

  document.querySelectorAll(".option-btn").forEach((btn) => {
    btn.textContent = "";
    btn.disabled = true;
    btn.classList.remove("selected", "correct", "wrong");
  });

  TOTAL_TIME = 10;
  timerEl.textContent = TOTAL_TIME;
  setRing(TOTAL_TIME);
});

socket.on("quizFinished", () => {
  questionEl.textContent = "Quiz finished — thank you!";
  document.querySelectorAll(".option-btn").forEach((btn) => (btn.disabled = true));
});

// ---------- RESUME (page refresh / reconnect mid-question) ----------
socket.on("state", (game) => {
  questionNo.textContent = `Question ${game.currentQuestion + 1}`;
  setProgress(game.currentQuestion, game.totalQuestions);

  if (!game.questionStarted || !game.question) {
    questionEl.textContent = "Waiting for Host...";
    TOTAL_TIME = 10;
    timerEl.textContent = game.timer;
    setRing(game.timer);
    return;
  }

  renderOptions(game.question);
  timerEl.textContent = game.timer;
  setRing(game.timer);

  const myPick = game.revealed ? game.myLastAnswer : game.myAnswer;
  answered = myPick !== null && myPick !== undefined;

  if (answered) {
    document.querySelectorAll(".option-btn").forEach((b) => (b.disabled = true));
    const picked = document.getElementById("a" + myPick);
    if (picked) picked.classList.add("selected");
    answeredNote.classList.remove("hidden");
  }

  if (game.revealed && game.correctAnswer !== null && game.correctAnswer !== undefined) {
    document.querySelectorAll(".option-btn").forEach((btn, i) => {
      btn.disabled = true;
      if (i === game.correctAnswer) btn.classList.add("correct");
      else if (btn.classList.contains("selected")) btn.classList.add("wrong");
    });
  }
});
