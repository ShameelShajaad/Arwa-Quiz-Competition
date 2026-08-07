/**
 * ARWA Quiz Competition Server
 * Full tournament system — Round 1 (2 segments) + Round 2 verbal + Grand Reveal
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

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function sanitizeQuestion(q) {
  if (!q) return null;
  return {
    id: q.id,
    question: q.question,
    options: q.options,
    time: 15,
  };
}

function getCurrentQuestion() {
  if (game.globalQuestionIndex >= questions.length) {
    // wrap / reuse if we run out
    return questions[game.globalQuestionIndex % questions.length];
  }
  return questions[game.globalQuestionIndex];
}

function schoolById(id) {
  return game.schools.find((s) => s.id === id);
}

function schoolName(id) {
  const s = schoolById(id);
  return s ? s.name || `School ${id + 1}` : "—";
}

function getActiveSchools() {
  if (game.activeA == null || game.activeB == null) return [];
  return [schoolById(game.activeA), schoolById(game.activeB)].filter(Boolean);
}

function clearTimer() {
  if (game.interval) {
    clearInterval(game.interval);
    game.interval = null;
  }
  game.timerRunning = false;
}

function startCountdown(seconds, onTick, onDone) {
  clearTimer();
  game.timer = seconds;
  game.timerRunning = true;
  io.emit("timer", game.timer);
  game.interval = setInterval(() => {
    game.timer--;
    io.emit("timer", game.timer);
    if (typeof onTick === "function") onTick(game.timer);
    if (game.timer <= 0) {
      clearTimer();
      game.timer = 0;
      io.emit("timer", 0);
      io.emit("timerFinished");
      if (typeof onDone === "function") onDone();
    }
  }, 1000);
}

/** Round 1 scoring: based on answer order */
function scoreRound1Question() {
  const q = getCurrentQuestion();
  const correct = q.answer;
  const order = game.answerOrder; // [{schoolId, answer, timestamp}]

  // Ensure both schools are considered even if one didn't answer
  const aId = game.activeA;
  const bId = game.activeB;
  const aEntry = order.find((o) => o.schoolId === aId);
  const bEntry = order.find((o) => o.schoolId === bId);

  const results = {};

  if (!aEntry && !bEntry) {
    results[aId] = 0;
    results[bId] = 0;
  } else if (aEntry && !bEntry) {
    results[aId] = aEntry.answer === correct ? 10 : 0;
    results[bId] = 0;
  } else if (!aEntry && bEntry) {
    results[bId] = bEntry.answer === correct ? 10 : 0;
    results[aId] = 0;
  } else {
    // both answered — order matters
    const first = order[0];
    const second = order[1];
    const firstCorrect = first.answer === correct;
    const secondCorrect = second.answer === correct;

    if (firstCorrect && secondCorrect) {
      results[first.schoolId] = 10;
      results[second.schoolId] = 5;
    } else if (!firstCorrect && secondCorrect) {
      results[first.schoolId] = 0;
      results[second.schoolId] = 8;
    } else if (firstCorrect && !secondCorrect) {
      results[first.schoolId] = 10;
      results[second.schoolId] = 0;
    } else {
      results[first.schoolId] = 0;
      results[second.schoolId] = 0;
    }
  }

  // Apply to segment scores
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

function rankSchoolsBy(key) {
  return [...game.schools]
    .filter((s) => s.name)
    .sort((a, b) => b[key] - a[key] || a.id - b.id)
    .map((s) => s.id);
}

function buildPublicState(role, teamId) {
  const q = getCurrentQuestion();
  const base = {
    phase: game.phase,
    segment: game.segment,
    matchIndex: game.matchIndex,
    currentQuestionInMatch: game.currentQuestionInMatch,
    questionsPerMatch:
      game.phase === "round2" ? game.questionsPerMatchR2 : game.questionsPerMatchR1,
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
  };

  if (role === "host") {
    return {
      ...base,
      schools: game.schools.map((s) => ({
        id: s.id,
        name: s.name,
        scoreSeg1: s.scoreSeg1,
        scoreSeg2: s.scoreSeg2,
        scoreRound1: s.scoreRound1,
        scoreRound2: s.scoreRound2 || 0,
        connected: s.connected,
      })),
      answerOrder: game.answerOrder,
      answers: game.answers,
      rankingSeg1: game.rankingSeg1.map((id) => ({
        id,
        name: schoolName(id),
        score: schoolById(id)?.scoreSeg1 ?? 0,
      })),
      rankingRound1: game.rankingRound1.map((id) => ({
        id,
        name: schoolName(id),
        score: schoolById(id)?.scoreRound1 ?? 0,
      })),
      qualifiers: game.qualifiers.map((id) => ({ id, name: schoolName(id) })),
      round2Matchups: game.round2Matchups,
      round2Stage: game.round2Stage,
      round2FirstSchool: game.round2FirstSchool,
      round2SecondSchool: game.round2SecondSchool,
      grandRevealStep: game.grandRevealStep,
      finalRanking: game.finalRanking,
      matchupsSeg2: game.matchupsSeg2,
    };
  }

  if (role === "team") {
    return {
      ...base,
      mySchoolId: teamId,
      myName: schoolName(teamId),
      myAnswer: game.answers[teamId] ?? null,
      // teams never see scores or rankings
    };
  }

  // display / projector
  return {
    ...base,
    // ranking visibility rules applied in client + selective data
    rankingSeg1NamesOnly: game.rankingSeg1.map((id) => schoolName(id)),
    rankingRound1: game.rankingRound1.map((id) => ({
      name: schoolName(id),
      score: schoolById(id)?.scoreRound1 ?? 0,
    })),
    qualifiers: game.qualifiers.map((id) => schoolName(id)),
    round2Scores: game.phase === "round2"
      ? {
          a: schoolById(game.activeA)?.scoreRound2 ?? 0,
          b: schoolById(game.activeB)?.scoreRound2 ?? 0,
        }
      : null,
    round2Stage: game.round2Stage,
    grandRevealStep: game.grandRevealStep,
    finalRanking: game.finalRanking,
  };
}

function broadcastState() {
  io.sockets.sockets.forEach((socket) => {
    if (!socket.role) return;
    const payload = buildPublicState(socket.role, socket.teamId);
    socket.emit("state", payload);
  });
}

function emitToAll(event, data) {
  io.emit(event, data);
}

// ─────────────────────────────────────────────
// Socket handlers
// ─────────────────────────────────────────────

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

    if (role === "host") {
      socket.join("host");
      game.hostConnected = true;
    } else if (role === "display") {
      socket.join("display");
    } else if (role === "team") {
      socket.teamId = Number(schoolId);
      socket.join("team");
      const s = schoolById(socket.teamId);
      if (s) s.connected = true;
    }

    socket.emit("state", buildPublicState(socket.role, socket.teamId));
  });

  // ── SETUP: set 8 school names ──
  socket.on("setSchools", (names) => {
    if (socket.role !== "host") return;
    if (!Array.isArray(names) || names.length !== 8) return;
    names.forEach((n, i) => {
      game.schools[i].name = String(n || "").trim() || `School ${i + 1}`;
      game.schools[i].scoreSeg1 = 0;
      game.schools[i].scoreSeg2 = 0;
      game.schools[i].scoreRound1 = 0;
      game.schools[i].scoreRound2 = 0;
    });
    game.phase = "setup";
    broadcastState();
  });

  // ── Start Segment 01 ──
  socket.on("startSegment1", () => {
    if (socket.role !== "host") return;
    if (!game.schools.every((s) => s.name)) return;

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

  // ── START QUESTION (Round 1) — question only, options hidden ──
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

  // ── REVEAL OPTIONS + start 15s timer ──
  socket.on("revealOptions", () => {
    if (socket.role !== "host") return;
    if (!game.questionStarted || game.optionsRevealed) return;

    game.optionsRevealed = true;
    const q = getCurrentQuestion();

    emitToAll("optionsRevealed", {
      options: q.options,
      currentQuestionInMatch: game.currentQuestionInMatch,
    });

    startCountdown(15, null, () => {
      // auto-disable answering on timer end
      broadcastState();
    });

    broadcastState();
  });

  // ── Team submits answer (Round 1 only) ──
  socket.on("answer", (data) => {
    if (socket.role !== "team") return;
    const schoolId = Number(data.schoolId ?? socket.teamId);
    if (schoolId !== game.activeA && schoolId !== game.activeB) return;
    if (!game.optionsRevealed || !game.timerRunning) return;
    if (game.answers[schoolId] != null) return; // already answered

    const answer = Number(data.answer);
    game.answers[schoolId] = answer;
    game.answerOrder.push({
      schoolId,
      answer,
      timestamp: Date.now(),
    });

    emitToAll("answerRecorded", {
      schoolId,
      schoolName: schoolName(schoolId),
      order: game.answerOrder.length,
    });

    // Host status
    io.to("host").emit("answerStatus", {
      order: game.answerOrder.map((o) => ({
        schoolId: o.schoolId,
        name: schoolName(o.schoolId),
      })),
      aAnswered: game.answers[game.activeA] != null,
      bAnswered: game.answers[game.activeB] != null,
    });

    broadcastState();
  });

  // ── REVEAL ANSWER + score ──
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
        a: {
          id: game.activeA,
          name: schoolName(game.activeA),
          seg1: schoolById(game.activeA)?.scoreSeg1,
          seg2: schoolById(game.activeA)?.scoreSeg2,
          total: schoolById(game.activeA)?.scoreRound1,
        },
        b: {
          id: game.activeB,
          name: schoolName(game.activeB),
          seg1: schoolById(game.activeB)?.scoreSeg1,
          seg2: schoolById(game.activeB)?.scoreSeg2,
          total: schoolById(game.activeB)?.scoreRound1,
        },
      },
    });

    broadcastState();
  });

  // ── NEXT QUESTION (or next match / end segment) ──
  socket.on("nextQuestion", () => {
    if (socket.role !== "host") return;

    if (game.phase === "segment1" || game.phase === "segment2") {
      advanceRound1();
      return;
    }

    if (game.phase === "round2") {
      advanceRound2();
      return;
    }
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

    if (game.currentQuestionInMatch >= maxQ) {
      // match finished
      game.currentQuestionInMatch = 0;
      game.matchIndex++;

      const maxMatches = 4;
      if (game.matchIndex >= maxMatches) {
        // segment finished
        if (game.segment === 1) {
          finishSegment1();
        } else {
          finishSegment2();
        }
        return;
      }

      // next matchup
      const pairs =
        game.segment === 1 ? game.matchupsSeg1 : game.matchupsSeg2;
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
    // build Segment 02 pairings: 1st vs 2nd, 3rd vs 4th, ...
    game.matchupsSeg2 = [
      [game.rankingSeg1[0], game.rankingSeg1[1]],
      [game.rankingSeg1[2], game.rankingSeg1[3]],
      [game.rankingSeg1[4], game.rankingSeg1[5]],
      [game.rankingSeg1[6], game.rankingSeg1[7]],
    ];
    game.phase = "segment1_ranking";
    emitToAll("segmentFinished", {
      segment: 1,
      rankingNames: game.rankingSeg1.map((id) => schoolName(id)),
      // host gets scores via state
    });
    broadcastState();
  }

  function finishSegment2() {
    // final Round 1 scores already accumulated
    game.rankingRound1 = rankSchoolsBy("scoreRound1");
    game.qualifiers = game.rankingRound1.slice(0, 4);
    game.phase = "round1_final";
    emitToAll("roundFinished", {
      ranking: game.rankingRound1.map((id) => ({
        id,
        name: schoolName(id),
        score: schoolById(id)?.scoreRound1 ?? 0,
      })),
      qualifiers: game.qualifiers.map((id) => schoolName(id)),
    });
    broadcastState();
  }

  // Host proceeds from Segment 1 ranking → Segment 2
  socket.on("startSegment2", () => {
    if (socket.role !== "host") return;
    if (game.phase !== "segment1_ranking") return;

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

  // Host proceeds to Round 2 pairing after Round 1 final
  socket.on("goToRound2Pairing", () => {
    if (socket.role !== "host") return;
    if (game.phase !== "round1_final" && game.phase !== "qualifiers") return;
    game.phase = "round2_pairing";
    broadcastState();
  });

  // Host sets Round 2 pairings manually
  socket.on("setRound2Pairings", (payload) => {
    if (socket.role !== "host") return;
    // payload: { match1: [idA, idB], match2: [idC, idD] }
    const { match1, match2 } = payload || {};
    if (!Array.isArray(match1) || !Array.isArray(match2)) return;
    if (match1.length !== 2 || match2.length !== 2) return;

    const all = [...match1, ...match2];
    if (new Set(all).size !== 4) return; // duplicates
    if (!all.every((id) => game.qualifiers.includes(id))) return;

    game.round2Matchups = [match1, match2];
    game.round2Scores = {};
    game.qualifiers.forEach((id) => {
      game.round2Scores[id] = 0;
      const s = schoolById(id);
      if (s) s.scoreRound2 = 0;
    });

    // start first Round 2 match
    game.phase = "round2";
    game.round2MatchIndex = 0;
    game.currentQuestionInMatch = 0;
    game.activeA = match1[0];
    game.activeB = match1[1];
    game.round2FirstSchool = game.activeA; // Q1 first school = A
    game.round2SecondSchool = game.activeB;
    game.round2Stage = "first_individual";
    game.questionStarted = false;
    game.optionsRevealed = false;
    game.revealed = false;
    clearTimer();

    emitToAll("phaseChanged", { phase: "round2", matchIndex: 0 });
    broadcastState();
  });

  // ── ROUND 2: start question (show question, no options for teams) ──
  socket.on("round2StartQuestion", () => {
    if (socket.role !== "host") return;
    if (game.phase !== "round2") return;

    game.questionStarted = true;
    game.optionsRevealed = false; // not used
    game.revealed = false;
    game.round2Stage = "first_individual";
    clearTimer();
    game.timer = 15;

    // Alternate first school every question
    // Q1 (index 0) → activeA first, Q2 → activeB first, etc.
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

  // Host starts timer for current Round 2 stage
  socket.on("round2StartTimer", () => {
    if (socket.role !== "host") return;
    if (game.phase !== "round2" || !game.questionStarted) return;
    startCountdown(15);
    broadcastState();
  });

  // Host records Round 2 result
  // type: "first_correct" | "first_failed" | "second_correct" | "second_failed" | "fellow_correct" | "no_points"
  socket.on("round2Result", (data) => {
    if (socket.role !== "host") return;
    if (game.phase !== "round2") return;

    const type = data?.type;
    let points = 0;
    let awardedTo = null;

    switch (type) {
      case "first_correct":
        points = 10;
        awardedTo = game.round2FirstSchool;
        game.round2Stage = "done";
        break;
      case "first_failed":
        game.round2Stage = "second_individual";
        clearTimer();
        game.timer = 15;
        break;
      case "second_correct":
        points = 8;
        awardedTo = game.round2SecondSchool;
        game.round2Stage = "done";
        break;
      case "second_failed":
        game.round2Stage = "fellow_members";
        clearTimer();
        game.timer = 15;
        break;
      case "fellow_correct":
        points = 5;
        awardedTo = game.round2FirstSchool; // fellow members of first school
        game.round2Stage = "done";
        break;
      case "no_points":
        points = 0;
        game.round2Stage = "done";
        break;
      default:
        return;
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
      type,
      points,
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
      // match finished
      game.currentQuestionInMatch = 0;
      game.round2MatchIndex++;

      if (game.round2MatchIndex >= 2) {
        // both Round 2 matches done → final ranking + grand reveal
        finishRound2();
        return;
      }

      // next Round 2 matchup
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
    // Build final ranking of the 4 qualifiers by Round 2 score
    // (could also combine with Round 1 if desired; spec uses Round 2 match results for placements)
    const four = game.qualifiers.map((id) => {
      const s = schoolById(id);
      return {
        id,
        name: s.name,
        points: s.scoreRound2 || 0,
        round1: s.scoreRound1 || 0,
      };
    });
    four.sort((a, b) => b.points - a.points || b.round1 - a.round1);
    four.forEach((f, i) => (f.place = i + 1));

    game.finalRanking = four;
    game.phase = "grand_reveal";
    game.grandRevealStep = 0;

    emitToAll("competitionFinished", { finalRanking: four });
    broadcastState();
  }

  // Grand reveal steps
  socket.on("grandRevealNext", () => {
    if (socket.role !== "host") return;
    if (game.phase !== "grand_reveal") return;
    if (game.grandRevealStep >= 4) return;

    game.grandRevealStep++;
    const place = 5 - game.grandRevealStep; // 4,3,2,1
    const entry = game.finalRanking.find((f) => f.place === place);

    emitToAll("grandReveal", {
      step: game.grandRevealStep,
      place,
      school: entry ? entry.name : "—",
      points: entry ? entry.points : 0,
      isChampion: place === 1,
    });

    if (game.grandRevealStep >= 4) {
      game.phase = "finished";
    }
    broadcastState();
  });

  // Reset entire competition
  socket.on("resetCompetition", () => {
    if (socket.role !== "host") return;
    clearTimer();
    Object.assign(game, {
      phase: "setup",
      segment: 1,
      matchIndex: 0,
      matchupsSeg2: null,
      activeA: null,
      activeB: null,
      currentQuestionInMatch: 0,
      questionStarted: false,
      optionsRevealed: false,
      revealed: false,
      timer: 15,
      timerRunning: false,
      interval: null,
      answerOrder: [],
      answers: {},
      rankingSeg1: [],
      rankingRound1: [],
      qualifiers: [],
      round2Matchups: null,
      round2MatchIndex: 0,
      round2Scores: {},
      round2Stage: "first_individual",
      round2FirstSchool: null,
      round2SecondSchool: null,
      grandRevealStep: 0,
      finalRanking: [],
      globalQuestionIndex: 0,
    });
    game.schools.forEach((s) => {
      s.scoreSeg1 = 0;
      s.scoreSeg2 = 0;
      s.scoreRound1 = 0;
      s.scoreRound2 = 0;
      // keep names
    });
    broadcastState();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("ARWA Quiz Competition running on http://localhost:" + PORT);
});
