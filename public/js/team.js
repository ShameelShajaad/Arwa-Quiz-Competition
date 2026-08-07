const socket = io({
  transports: ["websocket"],
});

const TOTAL_TIME = 10;
const RING_CIRCUMFERENCE = 276.46;

const params = new URLSearchParams(window.location.search);
const team = params.get("team") || "";

const timerEl = document.getElementById("timer");
const ringFg = document.getElementById("ringFg");
const answeredNote = document.getElementById("answeredNote");

document.getElementById("teamName").textContent = team ? "TEAM " + team : "SELECT TEAM";

if (team) socket.emit("joinTeam", team);

let answered = false;

function setRing(time) {
  const ratio = Math.max(0, Math.min(1, time / TOTAL_TIME));
  ringFg.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - ratio);
}

// ---------- TIMER ----------
socket.on("timer", (time) => {
  timerEl.textContent = time;
  setRing(time);
});

// ---------- QUESTION ----------
socket.on("question", (q) => {
  answered = false;
  answeredNote.classList.add("hidden");

  document.getElementById("question").textContent = q.question;

  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById("a" + i);

    btn.textContent = q.options[i];
    btn.disabled = false;
    btn.classList.remove("selected", "correct", "wrong");

    btn.onclick = () => {
      if (!team) {
        alert("Please join a team first.");
        return;
      }
      if (answered) return;

      answered = true;

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
});

// ---------- REVEAL ----------
socket.on("correctAnswer", (correct) => {
  document.querySelectorAll(".option-btn").forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct) {
      btn.classList.add("correct");
      btn.classList.remove("wrong");
    } else if (btn.classList.contains("selected")) {
      btn.classList.add("wrong");
    }
  });
});

// ---------- NEXT QUESTION ----------
socket.on("questionChanged", (data) => {
  document.getElementById("questionNo").textContent = `Question ${data.currentQuestion + 1}`;
  document.getElementById("question").textContent = "Waiting for Host...";
  answeredNote.classList.add("hidden");
  answered = false;

  document.querySelectorAll(".option-btn").forEach((btn) => {
    btn.textContent = "";
    btn.disabled = true;
    btn.classList.remove("selected", "correct", "wrong");
  });

  timerEl.textContent = TOTAL_TIME;
  setRing(TOTAL_TIME);
});

socket.on("quizFinished", () => {
  document.getElementById("question").textContent = "Quiz finished — thank you!";
  document.querySelectorAll(".option-btn").forEach((btn) => (btn.disabled = true));
});

socket.on("connect", () => console.log("Team Connected"));
socket.on("disconnect", () => console.log("Team Disconnected"));
