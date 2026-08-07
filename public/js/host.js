const socket = io({ transports: ["websocket"] });
const RING = 276.46;
let TOTAL = 15;
let state = {};

const $ = (id) => document.getElementById(id);

function setRing(t) {
  const r = Math.max(0, Math.min(1, t / TOTAL));
  if ($("ringFg")) $("ringFg").style.strokeDashoffset = RING * (1 - r);
  if ($("ringFg")) $("ringFg").classList.toggle("urgent", t <= 3 && t > 0);
  if ($("timer")) $("timer").classList.toggle("urgent", t <= 3 && t > 0);
}

const inputs = $("schoolInputs");
if (inputs) {
  for (let i = 0; i < 8; i++) {
    const div = document.createElement("div");
    div.innerHTML = `<label class="text-xs text-muted">School ${i + 1}</label>
      <input type="text" class="w-full bg-brown-mid border border-gold/30 rounded px-3 py-2 text-ink school-name" data-i="${i}" placeholder="e.g. Royal College" />`;
    inputs.appendChild(div);
  }
}

function clickSound() { if (window.QuizSound) QuizSound.click(); }

if ($("saveSchoolsBtn")) $("saveSchoolsBtn").onclick = () => {
  clickSound();
  const names = [...document.querySelectorAll(".school-name")].map((el) => el.value.trim());
  if (names.some((n) => !n)) { alert("Please enter all 8 school names."); return; }
  socket.emit("setSchools", names);
  if ($("startSeg1Btn")) $("startSeg1Btn").disabled = false;
};

if ($("startSeg1Btn")) $("startSeg1Btn").onclick = () => { clickSound(); socket.emit("startSegment1"); };
if ($("startQBtn")) $("startQBtn").onclick = () => { clickSound(); socket.emit("startQuestion"); };
if ($("revealOptBtn")) $("revealOptBtn").onclick = () => { clickSound(); socket.emit("revealOptions"); };
if ($("revealAnsBtn")) $("revealAnsBtn").onclick = () => { clickSound(); socket.emit("revealAnswer"); };
if ($("nextQBtn")) $("nextQBtn").onclick = () => { clickSound(); socket.emit("nextQuestion"); };

if ($("r2StartQBtn")) $("r2StartQBtn").onclick = () => { clickSound(); socket.emit("round2StartQuestion"); };
if ($("r2TimerBtn")) $("r2TimerBtn").onclick = () => { clickSound(); socket.emit("round2StartTimer"); };
if ($("r2FirstCorrect")) $("r2FirstCorrect").onclick = () => { clickSound(); socket.emit("round2Result", { type: "first_correct" }); };
if ($("r2FirstFailed")) $("r2FirstFailed").onclick = () => { clickSound(); socket.emit("round2Result", { type: "first_failed" }); };
if ($("r2SecondCorrect")) $("r2SecondCorrect").onclick = () => { clickSound(); socket.emit("round2Result", { type: "second_correct" }); };
if ($("r2SecondFailed")) $("r2SecondFailed").onclick = () => { clickSound(); socket.emit("round2Result", { type: "second_failed" }); };
if ($("r2FellowCorrect")) $("r2FellowCorrect").onclick = () => { clickSound(); socket.emit("round2Result", { type: "fellow_correct" }); };
if ($("r2NoPoints")) $("r2NoPoints").onclick = () => { clickSound(); socket.emit("round2Result", { type: "no_points" }); };
if ($("r2NextQBtn")) $("r2NextQBtn").onclick = () => { clickSound(); socket.emit("nextQuestion"); };

if ($("startSeg2Btn")) $("startSeg2Btn").onclick = () => { clickSound(); socket.emit("startSegment2"); };
if ($("goRound2Btn")) $("goRound2Btn").onclick = () => { clickSound(); socket.emit("goToRound2Pairing"); };
if ($("grandNextBtn")) $("grandNextBtn").onclick = () => { clickSound(); socket.emit("grandRevealNext"); };
if ($("resetBtn")) $("resetBtn").onclick = () => { if (confirm("Reset entire competition?")) { socket.emit("resetCompetition"); location.reload(); } };

if ($("confirmPairingBtn")) $("confirmPairingBtn").onclick = () => {
  clickSound();
  const m1a = Number($("m1a").value), m1b = Number($("m1b").value);
  const m2a = Number($("m2a").value), m2b = Number($("m2b").value);
  if (new Set([m1a,m1b,m2a,m2b]).size !== 4) { alert("Each school must appear exactly once."); return; }
  socket.emit("setRound2Pairings", { match1: [m1a, m1b], match2: [m2a, m2b] });
};

socket.on("connect", () => {
  socket.emit("identify", { role: "host" });
  if ($("connectionBadge")) $("connectionBadge").classList.add("online");
  if ($("connectionText")) $("connectionText").textContent = "Connected";
});
socket.on("disconnect", () => {
  if ($("connectionBadge")) $("connectionBadge").classList.remove("online");
  if ($("connectionText")) $("connectionText").textContent = "Reconnecting…";
});
socket.on("timer", (t) => { if ($("timer")) $("timer").textContent = t; setRing(t); });
socket.on("state", (st) => { state = st; render(st); });

socket.on("questionStarted", (d) => {
  if ($("questionText")) $("questionText").textContent = d.question.question;
  ["ho0","ho1","ho2","ho3"].forEach((id,i) => { if ($(id)) { $(id).textContent = "???"; $(id).classList.remove("text-correct"); } });
  if ($("correctAnswer")) $("correctAnswer").textContent = "";
  if ($("startQBtn")) $("startQBtn").disabled = true;
  if ($("revealOptBtn")) $("revealOptBtn").disabled = false;
  if ($("revealAnsBtn")) $("revealAnsBtn").disabled = true;
  if ($("nextQBtn")) $("nextQBtn").disabled = true;
});
socket.on("optionsRevealed", (d) => {
  (d.options || []).forEach((opt, i) => { if ($("ho"+i)) $("ho"+i).textContent = opt; });
  if ($("revealOptBtn")) $("revealOptBtn").disabled = true;
  if ($("revealAnsBtn")) $("revealAnsBtn").disabled = false;
});
socket.on("correctAnswer", (d) => {
  if ($("correctAnswer")) $("correctAnswer").textContent = "Correct option: " + (d.correctAnswer != null ? ["A","B","C","D"][d.correctAnswer] : "");
  if (d.correctAnswer != null && $("ho"+d.correctAnswer)) $("ho"+d.correctAnswer).classList.add("text-correct");
  if ($("revealAnsBtn")) $("revealAnsBtn").disabled = true;
  if ($("nextQBtn")) $("nextQBtn").disabled = false;
});
socket.on("answerStatus", (d) => {
  if ($("stateA")) $("stateA").textContent = d.aAnswered ? "✅ Answered" : "⏳ Waiting";
  if ($("stateB")) $("stateB").textContent = d.bAnswered ? "✅ Answered" : "⏳ Waiting";
});
socket.on("round2QuestionStarted", (d) => {
  if ($("questionText")) $("questionText").textContent = d.question.question;
  if ($("turnInfo")) $("turnInfo").textContent = `First: ${d.firstSchool} · Second: ${d.secondSchool}`;
  ["ho0","ho1","ho2","ho3"].forEach((id) => { if ($(id)) $(id).textContent = "— (verbal)"; });
});
socket.on("round2AnswerResult", (d) => {
  if ($("correctAnswer")) $("correctAnswer").textContent = `${d.type} → ${d.points||0} pts ${d.awardedTo ? "to "+d.awardedTo : ""}`;
});

function render(st) {
  if ($("phaseBadge")) $("phaseBadge").textContent = (st.phase || "setup").toUpperCase().replace(/_/g, " ");
  const isSetup = st.phase === "setup";
  const isRanking = ["segment1_ranking","round1_final","qualifiers"].includes(st.phase);
  const isPairing = st.phase === "round2_pairing";
  const isComp = ["segment1","segment2","round2"].includes(st.phase);
  const isReveal = st.phase === "grand_reveal" || st.phase === "finished";

  if ($("setupPanel")) $("setupPanel").classList.toggle("hidden", !isSetup);
  if ($("compPanel")) $("compPanel").classList.toggle("hidden", !isComp);
  if ($("rankingPanel")) $("rankingPanel").classList.toggle("hidden", !isRanking && !isReveal);
  if ($("pairingPanel")) $("pairingPanel").classList.toggle("hidden", !isPairing);

  if (st.schools) {
    st.schools.forEach((s, i) => {
      const inp = document.querySelector(`.school-name[data-i="${i}"]`);
      if (inp && !inp.value && s.name) inp.value = s.name;
    });
  }

  if (isComp) {
    const maxQ = st.questionsPerMatch || 10;
    if ($("questionNo")) $("questionNo").textContent = `Q ${(st.currentQuestionInMatch||0)+1} / ${maxQ}`;
    if ($("matchInfo")) $("matchInfo").textContent = `Match ${(st.matchIndex||0)+1} · ${st.phase === "round2" ? "ROUND 2" : "Segment "+(st.segment||"")}`;
    if ($("schoolsVs")) $("schoolsVs").textContent = `${st.schoolAName||"—"}  vs  ${st.schoolBName||"—"}`;
    if ($("statusA")) $("statusA").textContent = st.schoolAName || "—";
    if ($("statusB")) $("statusB").textContent = st.schoolBName || "—";
    const isR2 = st.phase === "round2";
    if ($("r1Controls")) $("r1Controls").classList.toggle("hidden", isR2);
    if ($("r2Controls")) $("r2Controls").classList.toggle("hidden", !isR2);
    if (st.question && st.questionStarted && $("questionText")) $("questionText").textContent = st.question.question;
    if (!isR2) {
      if ($("startQBtn")) $("startQBtn").disabled = !!st.questionStarted;
      if ($("revealOptBtn")) $("revealOptBtn").disabled = !st.questionStarted || st.optionsRevealed;
      if ($("revealAnsBtn")) $("revealAnsBtn").disabled = !st.optionsRevealed || st.revealed;
      if ($("nextQBtn")) $("nextQBtn").disabled = !st.revealed;
    }
  }

  if (st.schools && $("scoreBoard")) {
    $("scoreBoard").innerHTML = st.schools.filter(s => s.name)
      .map(s => `<div class="score-row flex justify-between gap-2"><span>${s.name}</span><span class="text-xs">R1:${s.scoreRound1||0} (S1:${s.scoreSeg1||0}+S2:${s.scoreSeg2||0}) R2:${s.scoreRound2||0}</span></div>`).join("");
  }

  if (st.phase === "segment1_ranking") {
    if ($("rankingTitle")) $("rankingTitle").textContent = "SEGMENT 01 COMPLETE — RANKING";
    if ($("rankingList")) $("rankingList").innerHTML = (st.rankingSeg1||[]).map((r,i) => `<div class="score-row"><span>${i+1}. ${r.name}</span><span class="text-muted">${r.score} pts (host)</span></div>`).join("");
    if ($("startSeg2Btn")) $("startSeg2Btn").classList.remove("hidden");
  } else if (st.phase === "round1_final") {
    if ($("rankingTitle")) $("rankingTitle").textContent = "ROUND 1 FINAL RANKING";
    if ($("rankingList")) $("rankingList").innerHTML = (st.rankingRound1||[]).map((r,i) => `<div class="score-row"><span>${i+1}. ${r.name}</span><span>${r.score} pts</span></div>`).join("");
    if ($("goRound2Btn")) $("goRound2Btn").classList.remove("hidden");
    if ($("startSeg2Btn")) $("startSeg2Btn").classList.add("hidden");
  } else if (isReveal) {
    if ($("rankingTitle")) $("rankingTitle").textContent = "GRAND REVEAL";
    if ($("rankingList")) $("rankingList").innerHTML = (st.finalRanking||[]).map(r => `<div class="score-row"><span>${r.place}. ${r.name}</span><span>${r.points} pts</span></div>`).join("");
    if ($("grandNextBtn")) { $("grandNextBtn").classList.remove("hidden"); $("grandNextBtn").textContent = (st.grandRevealStep||0) >= 4 ? "FINISHED" : "NEXT REVEAL →"; }
  }

  if (st.phase === "round2_pairing" && st.qualifiers) {
    const opts = st.qualifiers.map(q => `<option value="${q.id}">${q.name}</option>`).join("");
    ["m1a","m1b","m2a","m2b"].forEach(id => { if ($(id)) $(id).innerHTML = opts; });
    if ($("qualifierList")) $("qualifierList").innerHTML = st.qualifiers.map(q => `<div class="glass-soft px-3 py-2">${q.name}</div>`).join("");
  }
}
