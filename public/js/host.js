const socket = io({
  transports: ["websocket"],
});

// ----------------------------
// ELEMENTS
// ----------------------------

const timer = document.getElementById("timer");
const questionNo = document.getElementById("questionNo");

const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const revealBtn = document.getElementById("revealBtn");

const clickSound=document.getElementById("clickSound");

document.getElementById("nextBtn").disabled = true;

// ----------------------------
// TEAM STATUS
// ----------------------------

const status = {
  A: false,
  B: false,
  C: false,
  D: false,
};

function updateStatus() {
  const teamStatus = document.getElementById("teamStatus");

  if (!teamStatus) return;

  teamStatus.innerHTML = `

    <div>Team A ${status.A ? "✅ Answered" : "⏳ Waiting"}</div>

    <div>Team B ${status.B ? "✅ Answered" : "⏳ Waiting"}</div>

    <div>Team C ${status.C ? "✅ Answered" : "⏳ Waiting"}</div>

    <div>Team D ${status.D ? "✅ Answered" : "⏳ Waiting"}</div>

    `;
}

updateStatus();

// ----------------------------
// BUTTONS
// ----------------------------

startBtn.onclick = () => {
  socket.emit("startTimer");

  startBtn.disabled = true;
  nextBtn.disabled = true;
};

nextBtn.onclick = () => {
  socket.emit("nextQuestion");
};

revealBtn.onclick = () => {
  socket.emit("revealAnswer");

  document.getElementById("nextBtn").disabled = false;
};

// ----------------------------
// SOCKET EVENTS
// ----------------------------

// Timer update
socket.on("timer", (time) => {
  timer.innerHTML = time;
});

// Timer finished
socket.on("timerFinished", () => {
    timer.innerHTML = "TIME UP!";
    revealBtn.disabled = false;
});

// Team answered
socket.on("teamAnswered", (data) => {
  status[data.team] = true;

  updateStatus();
});

// Next Question
socket.on("questionChanged", (data) => {
  document.getElementById("questionNo").innerHTML =
    `Question ${data.currentQuestion + 1} / ${data.totalQuestions}`;

  status.A = false;
  status.B = false;
  status.C = false;
  status.D = false;

  updateStatus();
});

// Current state (when host refreshes)
socket.on("state", (game) => {
  timer.innerHTML = game.timer;

  questionNo.innerHTML = `Question ${game.currentQuestion + 1}`;
});

// Connection
socket.on("connect", () => {
  console.log("Host Connected");
});

socket.on("disconnect", () => {
  console.log("Host Disconnected");
});

socket.on("correctAnswer", (answer) => {
  document.getElementById("correctAnswer").innerHTML =
    "Correct Answer : " + (answer + 1);
});

socket.on("leaderboard", (teams) => {
  teams.sort((a, b) => b.score - a.score);

  let html = "";

  teams.forEach((team) => {
    html += `
<div>
Team ${team.id} - ${team.score}
</div>
`;
  });

  document.getElementById("miniLeaderboard").innerHTML = html;
});

socket.on("timerFinished", () => {
  document.getElementById("startBtn").disabled = false;
});

socket.on("questionChanged", () => {
  document.getElementById("nextBtn").disabled = true;
});

startBtn.disabled = false;
revealBtn.disabled = true;