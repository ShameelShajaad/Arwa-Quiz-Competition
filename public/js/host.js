const socket = io({ transports: ["websocket"] });
const RING = 276.46;
let TOTAL = 15;
let state = {};
let pairRowsData = []; // [{a,b}, ...] for current pairing UI
let pairingMode = null; // 'seg1' | 'seg2' | 'r2'

const $ = (id) => document.getElementById(id);
function clickSound() { if (window.QuizSound) QuizSound.click(); }
function setRing(t) {
  const r = Math.max(0, Math.min(1, t / TOTAL));
  if ($("ringFg")) $("ringFg").style.strokeDashoffset = RING * (1 - r);
  if ($("ringFg")) $("ringFg").classList.toggle("urgent", t <= 3 && t > 0);
  if ($("timer")) $("timer").classList.toggle("urgent", t <= 3 && t > 0);
}

function buildNameInputs(n) {
  const box = $("schoolInputs");
  if (!box) return;
  box.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const div = document.createElement("div");
    div.innerHTML = `<label class="text-xs text-muted">School ${i + 1}</label>
      <input type="text" class="school-name" data-i="${i}" placeholder="e.g. Royal College" />`;
    box.appendChild(div);
  }
}
buildNameInputs(8);

$("buildInputsBtn")?.addEventListener("click", () => {
  clickSound();
  let n = Number($("schoolCount").value) || 8;
  n = Math.min(8, Math.max(2, n));
  $("schoolCount").value = n;
  buildNameInputs(n);
});

$("saveSchoolsBtn")?.addEventListener("click", () => {
  clickSound();
  const names = [...document.querySelectorAll(".school-name")].map((el) => el.value.trim()).filter(Boolean);
  if (names.length < 2) { alert("Enter at least 2 school names."); return; }
  socket.emit("setSchools", { names, count: names.length });
  if ($("goSeg1PairBtn")) $("goSeg1PairBtn").disabled = false;
  alert("Schools saved! Students can now join from the home page.");
});

$("goSeg1PairBtn")?.addEventListener("click", () => { clickSound(); socket.emit("goSeg1Pairing"); });
$("testR2Btn")?.addEventListener("click", () => {
  clickSound();
  if (!state.schools || !state.schools.length) {
    alert("Save school names first.");
    return;
  }
  socket.emit("testRound2");
});

$("goSeg2PairBtn")?.addEventListener("click", () => { clickSound(); socket.emit("goSeg2Pairing"); });
$("goRound2Btn")?.addEventListener("click", () => { clickSound(); socket.emit("goToRound2Pairing"); });
$("grandNextBtn")?.addEventListener("click", () => { clickSound(); socket.emit("grandRevealNext"); });
$("resetBtn")?.addEventListener("click", () => {
  if (confirm("Reset entire competition?")) { socket.emit("resetCompetition"); location.reload(); }
});

// R1 controls
$("startQBtn")?.addEventListener("click", () => { clickSound(); socket.emit("startQuestion"); });
$("revealOptBtn")?.addEventListener("click", () => { clickSound(); socket.emit("revealOptions"); });
$("revealAnsBtn")?.addEventListener("click", () => { clickSound(); socket.emit("revealAnswer"); });
$("nextQBtn")?.addEventListener("click", () => { clickSound(); socket.emit("nextQuestion"); });

// R2 controls
$("r2StartQBtn")?.addEventListener("click", () => { clickSound(); socket.emit("round2StartQuestion"); });
$("r2TimerBtn")?.addEventListener("click", () => { clickSound(); socket.emit("round2StartTimer"); });
$("r2FirstCorrect")?.addEventListener("click", () => { clickSound(); socket.emit("round2Result", { type: "first_correct" }); });
$("r2FirstFailed")?.addEventListener("click", () => { clickSound(); socket.emit("round2Result", { type: "first_failed" }); });
$("r2SecondCorrect")?.addEventListener("click", () => { clickSound(); socket.emit("round2Result", { type: "second_correct" }); });
$("r2SecondFailed")?.addEventListener("click", () => { clickSound(); socket.emit("round2Result", { type: "second_failed" }); });
$("r2FellowCorrect")?.addEventListener("click", () => { clickSound(); socket.emit("round2Result", { type: "fellow_correct" }); });
$("r2NoPoints")?.addEventListener("click", () => { clickSound(); socket.emit("round2Result", { type: "no_points" }); });
$("r2NextQBtn")?.addEventListener("click", () => { clickSound(); socket.emit("nextQuestion"); });

// Pairing UI helpers
function schoolOptions(selected) {
  const list = state.schools || [];
  return list.map((s) =>
    `<option value="${s.id}" ${Number(selected) === s.id ? "selected" : ""}>${s.name}</option>`
  ).join("");
}

function renderPairRows() {
  const box = $("pairRows");
  if (!box) return;
  box.innerHTML = pairRowsData.map((row, i) => `
    <div class="flex items-center gap-2 flex-wrap" data-row="${i}">
      <span class="text-muted text-sm w-16">Match ${i + 1}</span>
      <select class="pair-a flex-1" data-i="${i}">${schoolOptions(row.a)}</select>
      <span class="text-gold-soft">vs</span>
      <select class="pair-b flex-1" data-i="${i}">${schoolOptions(row.b)}</select>
      <button class="btn-outline text-xs remove-pair" data-i="${i}">✕</button>
    </div>
  `).join("");
  box.querySelectorAll(".pair-a").forEach((el) => {
    el.onchange = () => { pairRowsData[Number(el.dataset.i)].a = Number(el.value); };
  });
  box.querySelectorAll(".pair-b").forEach((el) => {
    el.onchange = () => { pairRowsData[Number(el.dataset.i)].b = Number(el.value); };
  });
  box.querySelectorAll(".remove-pair").forEach((el) => {
    el.onclick = () => {
      pairRowsData.splice(Number(el.dataset.i), 1);
      renderPairRows();
    };
  });
}

$("addPairBtn")?.addEventListener("click", () => {
  clickSound();
  const schools = state.schools || [];
  if (schools.length < 2) return;
  pairRowsData.push({ a: schools[0].id, b: schools[1].id });
  renderPairRows();
});

$("autoPairBtn")?.addEventListener("click", () => {
  clickSound();
  const schools = state.schools || [];
  pairRowsData = [];
  for (let i = 0; i + 1 < schools.length; i += 2) {
    pairRowsData.push({ a: schools[i].id, b: schools[i + 1].id });
  }
  renderPairRows();
});

$("confirmPairBtn")?.addEventListener("click", () => {
  clickSound();
  // collect current selects
  pairRowsData = [...document.querySelectorAll("#pairRows [data-row]")].map((row) => {
    const i = row.dataset.row;
    const a = Number(row.querySelector(".pair-a")?.value);
    const b = Number(row.querySelector(".pair-b")?.value);
    return { a, b };
  });
  const pairs = pairRowsData.map((r) => [r.a, r.b]);
  const flat = pairs.flat();
  if (pairs.length < 1) { alert("Add at least one match."); return; }
  if (flat.some((id, idx) => flat.indexOf(id) !== idx)) {
    alert("Each school can only appear once.");
    return;
  }
  if (pairs.some((p) => p[0] === p[1])) {
    alert("A school cannot compete against itself.");
    return;
  }

  if (pairingMode === "seg1") {
    socket.emit("setSeg1Pairings", pairs);
  } else if (pairingMode === "seg2") {
    socket.emit("setSeg2Pairings", pairs);
  } else if (pairingMode === "r2") {
    socket.emit("setRound2Pairings", {
      match1: pairs[0] || null,
      match2: pairs[1] || null,
    });
  }
});

socket.on("connect", () => {
  socket.emit("identify", { role: "host" });
  $("connectionBadge")?.classList.add("online");
  if ($("connectionText")) $("connectionText").textContent = "Connected";
});
socket.on("disconnect", () => {
  $("connectionBadge")?.classList.remove("online");
  if ($("connectionText")) $("connectionText").textContent = "Reconnecting…";
});
socket.on("timer", (t) => { if ($("timer")) $("timer").textContent = t; setRing(t); });
socket.on("state", (st) => { state = st; render(st); });

socket.on("questionStarted", (d) => {
  if ($("questionText")) $("questionText").textContent = d.question.question;
  ["ho0","ho1","ho2","ho3"].forEach((id) => {
    if ($(id)) { $(id).textContent = "???"; $(id).classList.remove("text-correct"); }
  });
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
  if ($("correctAnswer")) $("correctAnswer").textContent = `${d.type} → ${d.points || 0} pts ${d.awardedTo ? "to " + d.awardedTo : ""}`;
});

function openPairingUI(mode, title, hint, schoolsSource, showAuto) {
  pairingMode = mode;
  $("pairingPanel")?.classList.remove("hidden");
  if ($("pairingTitle")) $("pairingTitle").textContent = title;
  if ($("pairingHint")) $("pairingHint").textContent = hint;
  if ($("autoPairBtn")) $("autoPairBtn").classList.toggle("hidden", !showAuto);
  const list = schoolsSource || state.schools || [];
  if ($("pairingSchools")) {
    $("pairingSchools").innerHTML = list.map((s) =>
      `<span class="glass-soft px-3 py-1 text-sm">${s.name || s}</span>`
    ).join("");
  }
  // seed one empty pair
  if (list.length >= 2) {
    pairRowsData = [{ a: list[0].id ?? list[0], b: list[1].id ?? list[1] }];
  } else {
    pairRowsData = [];
  }
  renderPairRows();
}

function render(st) {
  if ($("phaseBadge")) $("phaseBadge").textContent = (st.phase || "setup").toUpperCase().replace(/_/g, " ");

  const isSetup = st.phase === "setup";
  const isPairing = ["seg1_pairing", "seg2_pairing", "round2_pairing"].includes(st.phase);
  const isComp = ["segment1", "segment2", "round2"].includes(st.phase);
  const isRanking = ["segment1_ranking", "round1_final", "grand_reveal", "finished"].includes(st.phase);

  $("setupPanel")?.classList.toggle("hidden", !isSetup && st.phase !== "setup");
  // keep setup visible only in setup
  if ($("setupPanel")) $("setupPanel").classList.toggle("hidden", st.phase !== "setup");
  $("compPanel")?.classList.toggle("hidden", !isComp);
  $("rankingPanel")?.classList.toggle("hidden", !isRanking);
  $("pairingPanel")?.classList.toggle("hidden", !isPairing);

  if (st.schools && st.schools.length && st.phase === "setup") {
    if ($("goSeg1PairBtn")) $("goSeg1PairBtn").disabled = false;
    // prefill inputs if empty
    st.schools.forEach((s, i) => {
      const inp = document.querySelector(`.school-name[data-i="${i}"]`);
      if (inp && !inp.value && s.name) inp.value = s.name;
    });
  }

  if (st.phase === "seg1_pairing") {
    openPairingUI("seg1", "SEGMENT 01 — SET PAIRINGS",
      "Decide who plays whom in Segment 01. Each school only once. Odd school can be left out (bye).",
      st.schools, true);
  } else if (st.phase === "seg2_pairing") {
    openPairingUI("seg2", "SEGMENT 02 — SET PAIRINGS (HOST DECIDES)",
      "You choose the pairs. Ranking is shown so you can avoid rematches if you want.",
      (st.rankingSeg1 || []).map((r) => ({ id: r.id, name: `${r.name} (${r.score} pts)` })),
      false);
  } else if (st.phase === "round2_pairing") {
    const qs = st.qualifiers || st.schools || [];
    openPairingUI("r2", "ROUND 2 — SET PAIRINGS",
      "Pair the qualifiers. Usually 2 matches for top 4. You can make 1 match if fewer schools.",
      qs, false);
  }

  if (isComp) {
    const maxQ = st.questionsPerMatch || 10;
    if ($("questionNo")) $("questionNo").textContent = `Q ${(st.currentQuestionInMatch || 0) + 1} / ${maxQ}`;
    if ($("matchInfo")) $("matchInfo").textContent =
      `Match ${(st.matchIndex || 0) + 1} · ${st.phase === "round2" ? "ROUND 2" : "Segment " + (st.segment || "")}`;
    if ($("schoolsVs")) $("schoolsVs").textContent = `${st.schoolAName || "—"}  vs  ${st.schoolBName || "—"}`;
    if ($("statusA")) $("statusA").textContent = st.schoolAName || "—";
    if ($("statusB")) $("statusB").textContent = st.schoolBName || "—";
    const isR2 = st.phase === "round2";
    $("r1Controls")?.classList.toggle("hidden", isR2);
    $("r2Controls")?.classList.toggle("hidden", !isR2);
    if (st.question && st.questionStarted && $("questionText"))
      $("questionText").textContent = st.question.question;
    if (!isR2) {
      if ($("startQBtn")) $("startQBtn").disabled = !!st.questionStarted;
      if ($("revealOptBtn")) $("revealOptBtn").disabled = !st.questionStarted || st.optionsRevealed;
      if ($("revealAnsBtn")) $("revealAnsBtn").disabled = !st.optionsRevealed || st.revealed;
      if ($("nextQBtn")) $("nextQBtn").disabled = !st.revealed;
    }
    if (st.round2Stage && $("turnInfo"))
      $("turnInfo").textContent = "Stage: " + st.round2Stage.replace(/_/g, " ");
  }

  if (st.schools && $("scoreBoard")) {
    $("scoreBoard").innerHTML = st.schools.filter((s) => s.name)
      .map((s) => `<div class="score-row flex justify-between gap-2"><span>${s.name}</span>
        <span class="text-xs">R1:${s.scoreRound1 || 0} (S1:${s.scoreSeg1 || 0}+S2:${s.scoreSeg2 || 0}) R2:${s.scoreRound2 || 0}</span></div>`)
      .join("");
  }

  if (st.phase === "segment1_ranking") {
    if ($("rankingTitle")) $("rankingTitle").textContent = "SEGMENT 01 COMPLETE — RANKING";
    if ($("rankingList")) $("rankingList").innerHTML = (st.rankingSeg1 || [])
      .map((r, i) => `<div class="score-row"><span>${i + 1}. ${r.name}</span><span class="text-muted">${r.score} pts (host)</span></div>`).join("");
    $("goSeg2PairBtn")?.classList.remove("hidden");
  } else if (st.phase === "round1_final") {
    if ($("rankingTitle")) $("rankingTitle").textContent = "ROUND 1 FINAL RANKING";
    if ($("rankingList")) $("rankingList").innerHTML = (st.rankingRound1 || [])
      .map((r, i) => `<div class="score-row"><span>${i + 1}. ${r.name}</span><span>${r.score} pts</span></div>`).join("");
    $("goRound2Btn")?.classList.remove("hidden");
    $("goSeg2PairBtn")?.classList.add("hidden");
  } else if (st.phase === "grand_reveal" || st.phase === "finished") {
    if ($("rankingTitle")) $("rankingTitle").textContent = "GRAND REVEAL";
    if ($("rankingList")) $("rankingList").innerHTML = (st.finalRanking || [])
      .map((r) => `<div class="score-row"><span>${r.place}. ${r.name}</span><span>${r.points} pts</span></div>`).join("");
    $("grandNextBtn")?.classList.remove("hidden");
    if ($("grandNextBtn")) $("grandNextBtn").textContent =
      (st.grandRevealStep || 0) >= (st.finalRanking?.length || 4) ? "FINISHED" : "NEXT REVEAL →";
  }
}
