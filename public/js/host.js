const socket = io({
    transports: ["websocket"]
});

// ----------------------------
// ELEMENTS
// ----------------------------

const timer = document.getElementById("timer");
const questionNo = document.getElementById("questionNo");

const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const revealBtn = document.getElementById("revealBtn");

// ----------------------------
// TEAM STATUS
// ----------------------------

const status = {
    A: false,
    B: false,
    C: false,
    D: false
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

};

nextBtn.onclick = () => {

    socket.emit("nextQuestion");

};

revealBtn.onclick = () => {

    socket.emit("revealAnswer");

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

});

// Team answered
socket.on("teamAnswered", (data) => {

    status[data.team] = true;

    updateStatus();

});

// Next Question
socket.on("questionChanged", (data) => {

    questionNo.innerHTML = `Question ${data.currentQuestion + 1}`;

    status.A = false;
    status.B = false;
    status.C = false;
    status.D = false;

    updateStatus();

});

// Leaderboard received
socket.on("leaderboard", (teams) => {

    console.log("Leaderboard Updated");

    console.table(teams);

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