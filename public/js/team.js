const socket = io({ transports: ["websocket"] });
const RING = 276.46;
let TOTAL = 15;
let answered = false;
let mySchoolId = null;

const params = new URLSearchParams(window.location.search);
mySchoolId = Number(params.get("schoolId"));
if (isNaN(mySchoolId)) mySchoolId = null;

const $ = (id) => document.getElementById(id);

function setRing(t) {
  const r = Math.max(0, Math.min(1, t / TOTAL));
  $("ringFg").style.strokeDashoffset = RING * (1 - r);
  $("ringFg").classList.toggle("urgent", t <= 3 && t > 0);
  $("timer").classList.toggle("urgent", t <= 3 && t > 0);
}

function setProgress(cur, total) {
  if (!total) return;
  $("progressFill").style.width = `${((cur + 1) / total) * 100}%`;
}

function disableAll() {
  for (let i = 0; i < 4; i++) {
    const b = $("a" + i);
    b.disabled = true;
  }
}

function attach(btn, idx) {
  btn.onclick = () => {
    if (answered || btn.disabled) return;
    if (window.QuizSound) QuizSound.click();
    answered = true;
    disableAll();
    btn.classList.add("selected");
    $("answeredNote").classList.remove("hidden");
    socket.emit("answer", { schoolId: mySchoolId, answer: idx });
  };
}

socket.on("connect", () => {
  socket.emit("identify", { role: "team", schoolId: mySchoolId });
});

socket.on("timer", (t) => {
  $("timer").textContent = t;
  setRing(t);
  if (t <= 0) disableAll();
});

socket.on("state", (st) => {
  if (st.myName) $("teamName").textContent = st.myName;
  if (st.phase === "round2" || st.phase === "grand_reveal" || st.phase === "finished") {
    $("question").textContent = "Round 2 is verbal — no device answering required.";
    disableAll();
    $("statusNote").textContent = "Please listen to the Host.";
    return;
  }

  const maxQ = st.questionsPerMatch || 10;
  $("questionNo").textContent = st.questionStarted
    ? `Question ${(st.currentQuestionInMatch || 0) + 1} / ${maxQ}`
    : "Waiting for question…";
  setProgress(st.currentQuestionInMatch || 0, maxQ);

  if (st.question && st.questionStarted) {
    $("question").textContent = st.question.question;
    if (st.optionsRevealed && st.question.options) {
      st.question.options.forEach((opt, i) => {
        const b = $("a" + i);
        b.textContent = opt;
        b.disabled = answered || st.revealed || !st.timerRunning;
        b.classList.remove("correct", "wrong");
        if (!answered) attach(b, i);
      });
    } else {
      for (let i = 0; i < 4; i++) {
        $("a" + i).textContent = "…";
        $("a" + i).disabled = true;
      }
    }
    if (st.revealed && st.correctAnswer != null) {
      for (let i = 0; i < 4; i++) {
        const b = $("a" + i);
        if (i === st.correctAnswer) b.classList.add("correct");
        else if (b.classList.contains("selected")) b.classList.add("wrong");
      }
    }
    if (st.myAnswer != null) {
      answered = true;
      $("a" + st.myAnswer)?.classList.add("selected");
      $("answeredNote").classList.remove("hidden");
      disableAll();
    }
  } else {
    $("question").textContent = "Waiting for host to start the question…";
    for (let i = 0; i < 4; i++) {
      $("a" + i).textContent = "—";
      $("a" + i).disabled = true;
      $("a" + i).classList.remove("selected", "correct", "wrong");
    }
    answered = false;
    $("answeredNote").classList.add("hidden");
  }
});

socket.on("questionStarted", () => {
  answered = false;
  $("answeredNote").classList.add("hidden");
  for (let i = 0; i < 4; i++) {
    $("a" + i).classList.remove("selected", "correct", "wrong");
    $("a" + i).textContent = "…";
    $("a" + i).disabled = true;
  }
});

socket.on("optionsRevealed", (d) => {
  (d.options || []).forEach((opt, i) => {
    const b = $("a" + i);
    b.textContent = opt;
    b.disabled = false;
    attach(b, i);
  });
});

socket.on("timerFinished", () => disableAll());
socket.on("correctAnswer", () => disableAll());
socket.on("questionChanged", () => {
  answered = false;
  $("answeredNote").classList.add("hidden");
});
