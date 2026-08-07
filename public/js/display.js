const socket = io({ transports: ["websocket"] });
const RING = 276.46;
let TOTAL = 15;
const $ = (id) => document.getElementById(id);

function setRing(t) {
  const r = Math.max(0, Math.min(1, t / TOTAL));
  $("ringFg").style.strokeDashoffset = RING * (1 - r);
  $("ringFg").classList.toggle("urgent", t <= 3 && t > 0);
  $("timer").classList.toggle("urgent", t <= 3 && t > 0);
}

socket.on("connect", () => socket.emit("identify", { role: "display" }));
socket.on("timer", (t) => { $("timer").textContent = t; setRing(t); });

socket.on("state", (st) => {
  $("phaseLabel").textContent = (st.phase || "").replace(/_/g, " ").toUpperCase();
  $("vsLine").textContent = `${st.schoolAName || "—"}  vs  ${st.schoolBName || "—"}`;
  const maxQ = st.questionsPerMatch || 10;
  $("qMeta").textContent = st.questionStarted
    ? `Question ${(st.currentQuestionInMatch || 0) + 1} / ${maxQ}`
    : "Waiting";

  if (st.phase === "round2" && st.round2Scores) {
    $("scoreStrip").classList.remove("hidden");
    $("scoreStrip").textContent = `${st.schoolAName}: ${st.round2Scores.a}   ·   ${st.schoolBName}: ${st.round2Scores.b}`;
  } else {
    $("scoreStrip").classList.add("hidden");
  }

  if (st.question && st.questionStarted) {
    $("questionText").textContent = st.question.question;
    if (st.optionsRevealed && st.question.options) {
      st.question.options.forEach((o, i) => {
        $("do" + i).textContent = o;
        $("do" + i).classList.toggle("text-correct", st.revealed && st.correctAnswer === i);
      });
    } else if (st.phase !== "round2") {
      ["do0","do1","do2","do3"].forEach((id) => { $(id).textContent = st.questionStarted ? "???" : "—"; $(id).classList.remove("text-correct"); });
    } else {
      ["do0","do1","do2","do3"].forEach((id) => { $(id).textContent = "—"; });
    }
  }

  // Overlays for rankings / reveal
  if (st.phase === "segment1_ranking") {
    showOverlay("SEGMENT 01 RANKING", (st.rankingSeg1NamesOnly || []).map((n, i) => `${i + 1}. ${n}`));
  } else if (st.phase === "round1_final") {
    showOverlay("ROUND 1 FINAL", (st.rankingRound1 || []).map((r, i) => `${i + 1}. ${r.name} — ${r.score} pts`));
  } else if (st.phase === "grand_reveal" || st.phase === "finished") {
    // handled by grandReveal event mostly
  } else {
    hideOverlay();
  }

  if (st.round2Stage) {
    $("turnLabel").textContent = "Turn: " + st.round2Stage.replace(/_/g, " ");
  } else {
    $("turnLabel").textContent = "";
  }
});

socket.on("questionStarted", (d) => {
  $("questionText").textContent = d.question.question;
  ["do0","do1","do2","do3"].forEach((id) => { $(id).textContent = "???"; $(id).classList.remove("text-correct"); });
  hideOverlay();
});
socket.on("optionsRevealed", (d) => {
  (d.options || []).forEach((o, i) => { $("do" + i).textContent = o; });
});
socket.on("correctAnswer", (d) => {
  if (d.correctAnswer != null) $("do" + d.correctAnswer).classList.add("text-correct");
});
socket.on("round2QuestionStarted", (d) => {
  $("questionText").textContent = d.question.question;
  $("turnLabel").textContent = `First: ${d.firstSchool}`;
  ["do0","do1","do2","do3"].forEach((id) => { $(id).textContent = "—"; });
  hideOverlay();
});
socket.on("grandReveal", (d) => {
  const titles = { 4: "🏅 4TH PLACE", 3: "🥉 3RD PLACE", 2: "🥈 2ND PLACE", 1: "🏆 ARWA QUIZ CHAMPION" };
  $("overlay").classList.remove("hidden");
  $("overlay").classList.add("flex");
  $("ovTitle").textContent = titles[d.place] || "";
  $("ovList").innerHTML = "";
  if (d.isChampion) {
    $("ovChampion").classList.remove("hidden");
    $("champName").textContent = d.school;
    $("champPts").textContent = d.points + " points";
  } else {
    $("ovChampion").classList.add("hidden");
    $("ovList").innerHTML = `<div class="text-center text-2xl">${d.school}<br><span class="text-muted text-lg">${d.points} points</span></div>`;
  }
});

function showOverlay(title, lines) {
  $("overlay").classList.remove("hidden");
  $("overlay").classList.add("flex");
  $("ovTitle").textContent = title;
  $("ovChampion").classList.add("hidden");
  $("ovList").innerHTML = lines.map((l) => `<div class="score-row text-lg">${l}</div>`).join("");
}
function hideOverlay() {
  $("overlay").classList.add("hidden");
  $("overlay").classList.remove("flex");
}
