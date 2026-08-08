/**
 * ARWA Quiz Competition Server
 * Variable schools (2–8), manual Seg1/Seg2/R2 pairings, full tournament
 */
const questions = require("./data/questions.json");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const game = require("./game/gameState");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { transports: ["websocket"] });
app.use(express.static("public"));

function sanitizeQuestion(q) {
  if (!q) return null;
  return { id: q.id, question: q.question, options: q.options, time: 15 };
}
function getCurrentQuestion() {
  return questions[game.globalQuestionIndex % questions.length];
}
function schoolById(id) {
  return game.schools.find((s) => s.id === id);
}
function schoolName(id) {
  const s = schoolById(id);
  return s ? s.name || `School ${id + 1}` : "—";
}
function clearTimer() {
  if (game.interval) clearInterval(game.interval);
  game.interval = null;
  game.timerRunning = false;
}
function startCountdown(seconds) {
  clearTimer();
  game.timer = seconds;
  game.timerRunning = true;
  io.emit("timer", game.timer);
  game.interval = setInterval(() => {
    game.timer--;
    io.emit("timer", game.timer);
    if (game.timer <= 0) {
      clearTimer();
      game.timer = 0;
      io.emit("timer", 0);
      io.emit("timerFinished");
    }
  }, 1000);
}
function rankSchoolsBy(key) {
  return [...game.schools]
    .filter((s) => s.name)
    .sort((a, b) => b[key] - a[key] || a.id - b.id)
    .map((s) => s.id);
}
function activeSchoolsList() {
  return game.schools.filter((s) => s.name);
}
function scoreRound1Question() {
  const q = getCurrentQuestion();
  const correct = q.answer;
  const order = game.answerOrder;
  const aId = game.activeA;
  const bId = game.activeB;
  const aEntry = order.find((o) => o.schoolId === aId);
  const bEntry = order.find((o) => o.schoolId === bId);
  const results = {};

  if (!aEntry && !bEntry) {
    results[aId] = 0; results[bId] = 0;
  } else if (aEntry && !bEntry) {
    results[aId] = aEntry.answer === correct ? 10 : 0;
    results[bId] = 0;
  } else if (!aEntry && bEntry) {
    results[bId] = bEntry.answer === correct ? 10 : 0;
    results[aId] = 0;
  } else {
    const first = order[0], second = order[1];
    const fc = first.answer === correct, sc = second.answer === correct;
    if (fc && sc) { results[first.schoolId] = 10; results[second.schoolId] = 5; }
    else if (!fc && sc) { results[first.schoolId] = 0; results[second.schoolId] = 8; }
    else if (fc && !sc) { results[first.schoolId] = 10; results[second.schoolId] = 0; }
    else { results[first.schoolId] = 0; results[second.schoolId] = 0; }
  }
  const segKey = game.segment === 1 ? "scoreSeg1" : "scoreSeg2";
  Object.entries(results).forEach(([sid, pts]) => {
    const s = schoolById(Number(sid));
    if (s) {
      s[segKey] += pts;
      s.scoreRound1 = s.scoreSeg1 + s.scoreSeg2;
    }
  });
  return results;
}

function buildPublicState(role, teamId) {
  const q = getCurrentQuestion();
  const schoolsPayload = game.schools.map((s) => ({
    id: s.id,
    name: s.name,
    scoreSeg1: s.scoreSeg1,
    scoreSeg2: s.scoreSeg2,
    scoreRound1: s.scoreRound1,
    scoreRound2: s.scoreRound2 || 0,
    connected: s.connected,
  }));

  const base = {
    phase: game.phase,
    segment: game.segment,
    matchIndex: game.matchIndex,
    currentQuestionInMatch: game.currentQuestionInMatch,
    questionsPerMatch: game.phase === "round2" ? game.questionsPerMatchR2 : game.questionsPerMatchR1,
    timer: game.timer,
    timerRunning: game.timerRunning,
    questionStarted: game.questionStarted,
    optionsRevealed: game.optionsRevealed,
    revealed: game.revealed,
    activeA: game.activeA,
    activeB: game.activeB,
    schoolAName: schoolName(game.activeA),
    schoolBName: schoolName(game.activeB),
    question: game.questionStarted ? sanitizeQuestion(q) : null,
    correctAnswer: game.revealed && q ? q.answer : null,
    schoolCount: game.schoolCount,
    // ALWAYS send school list so join modal works for everyone
    schools: schoolsPayload,
  };

  if (role === "host") {
    return {
      ...base,
      answerOrder: game.answerOrder,
      answers: game.answers,
      aAnswered: game.activeA != null && game.answers[game.activeA] != null,
      bAnswered: game.activeB != null && game.answers[game.activeB] != null,
      rankingSeg1: game.rankingSeg1.map((id) => ({
        id, name: schoolName(id), score: schoolById(id)?.scoreSeg1 ?? 0,
      })),
      rankingRound1: game.rankingRound1.map((id) => ({
        id, name: schoolName(id), score: schoolById(id)?.scoreRound1 ?? 0,
      })),
      qualifiers: game.qualifiers.map((id) => ({ id, name: schoolName(id) })),
      round2Matchups: game.round2Matchups,
      round2Stage: game.round2Stage,
      round2FirstSchool: game.round2FirstSchool,
      round2SecondSchool: game.round2SecondSchool,
      grandRevealStep: game.grandRevealStep,
      finalRanking: game.finalRanking,
      matchupsSeg1: game.matchupsSeg1,
      matchupsSeg2: game.matchupsSeg2,
    };
  }

  if (role === "team") {
    return {
      ...base,
      mySchoolId: teamId,
      myName: schoolName(teamId),
      myAnswer: game.answers[teamId] ?? null,
    };
  }

  // display
  return {
    ...base,
    rankingSeg1NamesOnly: game.rankingSeg1.map((id) => schoolName(id)),
    rankingRound1: game.rankingRound1.map((id) => ({
      name: schoolName(id), score: schoolById(id)?.scoreRound1 ?? 0,
    })),
    qualifiers: game.qualifiers.map((id) => schoolName(id)),
    round2Scores: game.phase === "round2" ? {
      a: schoolById(game.activeA)?.scoreRound2 ?? 0,
      b: schoolById(game.activeB)?.scoreRound2 ?? 0,
    } : null,
    round2Stage: game.round2Stage,
    grandRevealStep: game.grandRevealStep,
    finalRanking: game.finalRanking,
  };
}

function broadcastState() {
  io.sockets.sockets.forEach((socket) => {
    if (!socket.role) return;
    socket.emit("state", buildPublicState(socket.role, socket.teamId));
  });
}
function emitToAll(event, data) { io.emit(event, data); }

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("disconnect", () => {
    if (socket.role === "team" && socket.teamId != null) {
      const s = schoolById(socket.teamId);
      if (s) s.connected = false;
      broadcastState();
    }
    if (socket.role === "host") game.hostConnected = false;
  });

  socket.on("identify", (payload = {}) => {
    const { role, schoolId } = payload;
    socket.role = role;
    if (role === "host") { socket.join("host"); game.hostConnected = true; }
    else if (role === "display") socket.join("display");
    else if (role === "team") {
      socket.teamId = Number(schoolId);
      socket.join("team");
      const s = schoolById(socket.teamId);
      if (s) s.connected = true;
    }
    socket.emit("state", buildPublicState(socket.role, socket.teamId));
  });

  // ── SETUP: host sets count + names ──
  socket.on("setSchools", (payload) => {
    if (socket.role !== "host") return;
    let names = payload;
    let count = 8;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      names = payload.names || [];
      count = Math.min(8, Math.max(2, Number(payload.count) || names.length || 8));
    }
    if (!Array.isArray(names)) return;
    names = names.slice(0, count).map((n) => String(n || "").trim()).filter(Boolean);
    if (names.length < 2) return;

    game.schoolCount = names.length;
    game.schools = names.map((name, i) => ({
      id: i,
      name,
      scoreSeg1: 0,
      scoreSeg2: 0,
      scoreRound1: 0,
      scoreRound2: 0,
      connected: false,
    }));
    game.phase = "setup";
    game.matchupsSeg1 = null;
    game.matchupsSeg2 = null;
    broadcastState();
  });

  // ── Segment 01 pairing (host decides pairs) ──
  socket.on("goSeg1Pairing", () => {
    if (socket.role !== "host") return;
    if (!game.schools.length) return;
    game.phase = "seg1_pairing";
    broadcastState();
  });

  socket.on("setSeg1Pairings", (pairs) => {
    if (socket.role !== "host") return;
    if (!Array.isArray(pairs) || pairs.length < 1) return;
    // pairs: [[idA,idB], ...]
    const used = new Set();
    for (const p of pairs) {
      if (!Array.isArray(p) || p.length !== 2) return;
      if (p[0] === p[1]) return;
      if (used.has(p[0]) || used.has(p[1])) return;
      used.add(p[0]); used.add(p[1]);
    }
    game.matchupsSeg1 = pairs.map((p) => [Number(p[0]), Number(p[1])]);
    // start segment 1
    game.phase = "segment1";
    game.segment = 1;
    game.matchIndex = 0;
    game.currentQuestionInMatch = 0;
    game.globalQuestionIndex = 0;
    game.questionStarted = false;
    game.optionsRevealed = false;
    game.revealed = false;
    game.answerOrder = [];
    game.answers = {};
    clearTimer();
    const pair = game.matchupsSeg1[0];
    game.activeA = pair[0];
    game.activeB = pair[1];
    emitToAll("phaseChanged", { phase: "segment1", segment: 1, matchIndex: 0 });
    broadcastState();
  });

  // Auto-suggest sequential pairs for convenience
  socket.on("autoSeg1Pairings", () => {
    if (socket.role !== "host") return;
    const ids = game.schools.map((s) => s.id);
    const pairs = [];
    for (let i = 0; i + 1 < ids.length; i += 2) {
      pairs.push([ids[i], ids[i + 1]]);
    }
    // if odd one out — leave unpaired (bye); host can still only run paired matches
    socket.emit("suggestedPairings", { pairs, bye: ids.length % 2 === 1 ? ids[ids.length - 1] : null });
  });

  // ── Round 1 question flow ──
  socket.on("startQuestion", () => {
    if (socket.role !== "host") return;
    if (game.phase !== "segment1" && game.phase !== "segment2") return;
    if (game.questionStarted) return;
    game.questionStarted = true;
    game.optionsRevealed = false;
    game.revealed = false;
    game.answerOrder = [];
    game.answers = {};
    clearTimer();
    game.timer = 15;
    const q = getCurrentQuestion();
    emitToAll("questionStarted", {
      question: sanitizeQuestion(q),
      optionsHidden: true,
      currentQuestionInMatch: game.currentQuestionInMatch,
      questionsPerMatch: game.questionsPerMatchR1,
      schoolA: schoolName(game.activeA),
      schoolB: schoolName(game.activeB),
    });
    broadcastState();
  });

  socket.on("revealOptions", () => {
    if (socket.role !== "host") return;
    if (!game.questionStarted || game.optionsRevealed) return;
    // Allowed in segment1, segment2, AND round2 (to show options on projector)
    if (!["segment1", "segment2", "round2"].includes(game.phase)) return;
    game.optionsRevealed = true;
    const q = getCurrentQuestion();
    emitToAll("optionsRevealed", {
      options: q.options,
      currentQuestionInMatch: game.currentQuestionInMatch,
      phase: game.phase,
    });
    // Round 1: start the 15s answering timer automatically
    // Round 2: host controls timer separately with START TIMER
    if (game.phase === "segment1" || game.phase === "segment2") {
      startCountdown(15);
    }
    broadcastState();
  });

  socket.on("answer", (data) => {
    if (socket.role !== "team") return;
    const schoolId = Number(data.schoolId ?? socket.teamId);
    if (schoolId !== game.activeA && schoolId !== game.activeB) return;
    if (!game.optionsRevealed || !game.timerRunning) return;
    if (game.answers[schoolId] != null) return;
    const answer = Number(data.answer);
    game.answers[schoolId] = answer;
    game.answerOrder.push({ schoolId, answer, timestamp: Date.now() });
    emitToAll("answerRecorded", { schoolId, schoolName: schoolName(schoolId), order: game.answerOrder.length });
    io.to("host").emit("answerStatus", {
      order: game.answerOrder.map((o) => ({ schoolId: o.schoolId, name: schoolName(o.schoolId) })),
      aAnswered: game.answers[game.activeA] != null,
      bAnswered: game.answers[game.activeB] != null,
    });
    broadcastState();
  });

  socket.on("revealAnswer", () => {
    if (socket.role !== "host") return;
    if (!game.questionStarted || game.revealed) return;
    clearTimer();
    game.revealed = true;
    game.timerRunning = false;
    const results = scoreRound1Question();
    const q = getCurrentQuestion();
    emitToAll("correctAnswer", {
      correctAnswer: q.answer,
      results,
      scores: {
        a: { id: game.activeA, name: schoolName(game.activeA), total: schoolById(game.activeA)?.scoreRound1 },
        b: { id: game.activeB, name: schoolName(game.activeB), total: schoolById(game.activeB)?.scoreRound1 },
      },
    });
    broadcastState();
  });

  socket.on("nextQuestion", () => {
    if (socket.role !== "host") return;
    if (game.phase === "segment1" || game.phase === "segment2") advanceRound1();
    else if (game.phase === "round2") advanceRound2();
  });

  function advanceRound1() {
    clearTimer();
    game.globalQuestionIndex++;
    game.currentQuestionInMatch++;
    game.questionStarted = false;
    game.optionsRevealed = false;
    game.revealed = false;
    game.answerOrder = [];
    game.answers = {};
    game.timer = 15;
    const maxQ = game.questionsPerMatchR1;
    const pairs = game.segment === 1 ? game.matchupsSeg1 : game.matchupsSeg2;

    if (game.currentQuestionInMatch >= maxQ) {
      game.currentQuestionInMatch = 0;
      game.matchIndex++;
      if (game.matchIndex >= pairs.length) {
        if (game.segment === 1) finishSegment1();
        else finishSegment2();
        return;
      }
      const pair = pairs[game.matchIndex];
      game.activeA = pair[0];
      game.activeB = pair[1];
      emitToAll("matchChanged", {
        matchIndex: game.matchIndex,
        schoolA: schoolName(game.activeA),
        schoolB: schoolName(game.activeB),
        segment: game.segment,
      });
    }
    emitToAll("questionChanged", {
      currentQuestionInMatch: game.currentQuestionInMatch,
      questionsPerMatch: maxQ,
      matchIndex: game.matchIndex,
      segment: game.segment,
    });
    broadcastState();
  }

  function finishSegment1() {
    game.rankingSeg1 = rankSchoolsBy("scoreSeg1");
    game.matchupsSeg2 = null; // host will set manually
    game.phase = "segment1_ranking";
    emitToAll("segmentFinished", {
      segment: 1,
      rankingNames: game.rankingSeg1.map((id) => schoolName(id)),
    });
    broadcastState();
  }

  function finishSegment2() {
    game.rankingRound1 = rankSchoolsBy("scoreRound1");
    // Top 4 or fewer if less than 4 schools
    const topN = Math.min(4, game.rankingRound1.length);
    game.qualifiers = game.rankingRound1.slice(0, topN);
    game.phase = "round1_final";
    emitToAll("roundFinished", {
      ranking: game.rankingRound1.map((id) => ({
        id, name: schoolName(id), score: schoolById(id)?.scoreRound1 ?? 0,
      })),
      qualifiers: game.qualifiers.map((id) => schoolName(id)),
    });
    broadcastState();
  }

  // After Seg1 ranking → go to manual Seg2 pairing
  socket.on("goSeg2Pairing", () => {
    if (socket.role !== "host") return;
    if (game.phase !== "segment1_ranking") return;
    game.phase = "seg2_pairing";
    broadcastState();
  });

  socket.on("setSeg2Pairings", (pairs) => {
    if (socket.role !== "host") return;
    if (!Array.isArray(pairs) || pairs.length < 1) return;
    const used = new Set();
    for (const p of pairs) {
      if (!Array.isArray(p) || p.length !== 2) return;
      if (p[0] === p[1]) return;
      if (used.has(p[0]) || used.has(p[1])) return;
      used.add(p[0]); used.add(p[1]);
    }
    game.matchupsSeg2 = pairs.map((p) => [Number(p[0]), Number(p[1])]);
    game.phase = "segment2";
    game.segment = 2;
    game.matchIndex = 0;
    game.currentQuestionInMatch = 0;
    game.questionStarted = false;
    game.optionsRevealed = false;
    game.revealed = false;
    game.answerOrder = [];
    game.answers = {};
    clearTimer();
    const pair = game.matchupsSeg2[0];
    game.activeA = pair[0];
    game.activeB = pair[1];
    emitToAll("phaseChanged", { phase: "segment2", segment: 2, matchIndex: 0 });
    broadcastState();
  });

  // ── Round 2 ──
  socket.on("goToRound2Pairing", () => {
    if (socket.role !== "host") return;
    if (game.phase !== "round1_final" && game.phase !== "qualifiers") return;
    game.phase = "round2_pairing";
    broadcastState();
  });

  // Host can jump to Round 2 for testing (uses current schools / or first 4)
  socket.on("testRound2", () => {
    if (socket.role !== "host") return;
    if (!game.schools.length) return;
    // Use top 4 by any existing score, or first 4 schools
    let ids = rankSchoolsBy("scoreRound1");
    if (ids.length < 2) ids = game.schools.map((s) => s.id);
    const top = ids.slice(0, Math.min(4, ids.length));
    if (top.length < 2) return;
    game.qualifiers = top;
    game.rankingRound1 = ids;
    game.phase = "round2_pairing";
    // reset R2 scores
    game.schools.forEach((s) => { s.scoreRound2 = 0; });
    game.round2Scores = {};
    broadcastState();
  });

  socket.on("setRound2Pairings", (payload) => {
    if (socket.role !== "host") return;
    const { match1, match2 } = payload || {};
    // Allow 1 or 2 matches depending on qualifier count
    const matches = [];
    if (Array.isArray(match1) && match1.length === 2) matches.push(match1);
    if (Array.isArray(match2) && match2.length === 2) matches.push(match2);
    if (matches.length < 1) return;
    const all = matches.flat();
    if (new Set(all).size !== all.length) return;

    game.round2Matchups = matches.map((m) => [Number(m[0]), Number(m[1])]);
    game.round2Scores = {};
    game.qualifiers.forEach((id) => {
      game.round2Scores[id] = 0;
      const s = schoolById(id);
      if (s) s.scoreRound2 = 0;
    });
    game.phase = "round2";
    game.round2MatchIndex = 0;
    game.currentQuestionInMatch = 0;
    game.activeA = game.round2Matchups[0][0];
    game.activeB = game.round2Matchups[0][1];
    game.round2FirstSchool = game.activeA;
    game.round2SecondSchool = game.activeB;
    game.round2Stage = "first_individual";
    game.questionStarted = false;
    game.optionsRevealed = false;
    game.revealed = false;
    clearTimer();
    emitToAll("phaseChanged", { phase: "round2", matchIndex: 0 });
    broadcastState();
  });

  socket.on("round2StartQuestion", () => {
    if (socket.role !== "host") return;
    if (game.phase !== "round2") return;
    game.questionStarted = true;
    game.optionsRevealed = false;
    game.revealed = false;
    game.round2Stage = "first_individual";
    clearTimer();
    game.timer = 15;
    if (game.currentQuestionInMatch % 2 === 0) {
      game.round2FirstSchool = game.activeA;
      game.round2SecondSchool = game.activeB;
    } else {
      game.round2FirstSchool = game.activeB;
      game.round2SecondSchool = game.activeA;
    }
    const q = getCurrentQuestion();
    emitToAll("round2QuestionStarted", {
      question: sanitizeQuestion(q),
      currentQuestionInMatch: game.currentQuestionInMatch,
      questionsPerMatch: game.questionsPerMatchR2,
      firstSchool: schoolName(game.round2FirstSchool),
      secondSchool: schoolName(game.round2SecondSchool),
      schoolA: schoolName(game.activeA),
      schoolB: schoolName(game.activeB),
    });
    broadcastState();
  });

  socket.on("round2StartTimer", () => {
    if (socket.role !== "host") return;
    if (game.phase !== "round2" || !game.questionStarted) return;
    startCountdown(15);
    broadcastState();
  });

  socket.on("round2Result", (data) => {
    if (socket.role !== "host") return;
    if (game.phase !== "round2") return;
    const type = data?.type;
    let points = 0, awardedTo = null;
    switch (type) {
      case "first_correct":
        points = 10; awardedTo = game.round2FirstSchool; game.round2Stage = "done"; break;
      case "first_failed":
        game.round2Stage = "second_individual"; clearTimer(); game.timer = 15; break;
      case "second_correct":
        points = 8; awardedTo = game.round2SecondSchool; game.round2Stage = "done"; break;
      case "second_failed":
        game.round2Stage = "fellow_members"; clearTimer(); game.timer = 15; break;
      case "fellow_correct":
        points = 5; awardedTo = game.round2FirstSchool; game.round2Stage = "done"; break;
      case "no_points":
        points = 0; game.round2Stage = "done"; break;
      default: return;
    }
    if (awardedTo != null && points > 0) {
      const s = schoolById(awardedTo);
      if (s) {
        s.scoreRound2 = (s.scoreRound2 || 0) + points;
        game.round2Scores[awardedTo] = s.scoreRound2;
      }
    }
    clearTimer();
    emitToAll("round2AnswerResult", {
      type, points,
      awardedTo: awardedTo != null ? schoolName(awardedTo) : null,
      stage: game.round2Stage,
      scores: {
        a: schoolById(game.activeA)?.scoreRound2 ?? 0,
        b: schoolById(game.activeB)?.scoreRound2 ?? 0,
      },
    });
    broadcastState();
  });

  function advanceRound2() {
    clearTimer();
    game.globalQuestionIndex++;
    game.currentQuestionInMatch++;
    game.questionStarted = false;
    game.round2Stage = "first_individual";
    game.timer = 15;
    const maxQ = game.questionsPerMatchR2;
    if (game.currentQuestionInMatch >= maxQ) {
      game.currentQuestionInMatch = 0;
      game.round2MatchIndex++;
      if (game.round2MatchIndex >= game.round2Matchups.length) {
        finishRound2();
        return;
      }
      const pair = game.round2Matchups[game.round2MatchIndex];
      game.activeA = pair[0];
      game.activeB = pair[1];
      game.round2FirstSchool = game.activeA;
      game.round2SecondSchool = game.activeB;
      emitToAll("matchChanged", {
        matchIndex: game.round2MatchIndex,
        schoolA: schoolName(game.activeA),
        schoolB: schoolName(game.activeB),
        phase: "round2",
      });
    }
    emitToAll("questionChanged", {
      currentQuestionInMatch: game.currentQuestionInMatch,
      questionsPerMatch: maxQ,
      matchIndex: game.round2MatchIndex,
      phase: "round2",
    });
    broadcastState();
  }

  function finishRound2() {
    const four = game.qualifiers.map((id) => {
      const s = schoolById(id);
      return { id, name: s.name, points: s.scoreRound2 || 0, round1: s.scoreRound1 || 0 };
    });
    four.sort((a, b) => b.points - a.points || b.round1 - a.round1);
    four.forEach((f, i) => (f.place = i + 1));
    game.finalRanking = four;
    game.phase = "grand_reveal";
    game.grandRevealStep = 0;
    emitToAll("competitionFinished", { finalRanking: four });
    broadcastState();
  }

  socket.on("grandRevealNext", () => {
    if (socket.role !== "host") return;
    if (game.phase !== "grand_reveal") return;
    if (game.grandRevealStep >= 4) return;
    game.grandRevealStep++;
    const place = Math.min(4, game.finalRanking.length) - game.grandRevealStep + 1;
    // reveal from last place up
    const sorted = [...game.finalRanking].sort((a, b) => b.place - a.place);
    const entry = sorted[game.grandRevealStep - 1];
    emitToAll("grandReveal", {
      step: game.grandRevealStep,
      place: entry ? entry.place : place,
      school: entry ? entry.name : "—",
      points: entry ? entry.points : 0,
      isChampion: entry && entry.place === 1,
    });
    if (game.grandRevealStep >= game.finalRanking.length) game.phase = "finished";
    broadcastState();
  });

  socket.on("resetCompetition", () => {
    if (socket.role !== "host") return;
    clearTimer();
    Object.assign(game, {
      phase: "setup", segment: 1, matchIndex: 0,
      matchupsSeg1: null, matchupsSeg2: null,
      activeA: null, activeB: null,
      currentQuestionInMatch: 0, questionStarted: false,
      optionsRevealed: false, revealed: false, timer: 15,
      timerRunning: false, interval: null,
      answerOrder: [], answers: {},
      rankingSeg1: [], rankingRound1: [], qualifiers: [],
      round2Matchups: null, round2MatchIndex: 0, round2Scores: {},
      round2Stage: "first_individual", round2FirstSchool: null, round2SecondSchool: null,
      grandRevealStep: 0, finalRanking: [], globalQuestionIndex: 0,
    });
    // keep school names if any
    game.schools.forEach((s) => {
      s.scoreSeg1 = 0; s.scoreSeg2 = 0; s.scoreRound1 = 0; s.scoreRound2 = 0;
    });
    broadcastState();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("ARWA Quiz Competition running on http://localhost:" + PORT);
});
