/**
 * ARWA Quiz Competition — Game State
 * Full tournament: 8 schools, Round 1 (2 segments), Round 2 verbal, Grand Reveal
 */

const gameState = {
  // Phase machine
  // setup | segment1 | segment1_ranking | segment2 | round1_final |
  // qualifiers | round2_pairing | round2 | grand_reveal | finished
  phase: "setup",

  // 8 schools — real names entered by host
  schools: [
    { id: 0, name: "", scoreSeg1: 0, scoreSeg2: 0, scoreRound1: 0, scoreRound2: 0, connected: false },
    { id: 1, name: "", scoreSeg1: 0, scoreSeg2: 0, scoreRound1: 0, scoreRound2: 0, connected: false },
    { id: 2, name: "", scoreSeg1: 0, scoreSeg2: 0, scoreRound1: 0, scoreRound2: 0, connected: false },
    { id: 3, name: "", scoreSeg1: 0, scoreSeg2: 0, scoreRound1: 0, scoreRound2: 0, connected: false },
    { id: 4, name: "", scoreSeg1: 0, scoreSeg2: 0, scoreRound1: 0, scoreRound2: 0, connected: false },
    { id: 5, name: "", scoreSeg1: 0, scoreSeg2: 0, scoreRound1: 0, scoreRound2: 0, connected: false },
    { id: 6, name: "", scoreSeg1: 0, scoreSeg2: 0, scoreRound1: 0, scoreRound2: 0, connected: false },
    { id: 7, name: "", scoreSeg1: 0, scoreSeg2: 0, scoreRound1: 0, scoreRound2: 0, connected: false },
  ],

  // Round 1 matchups
  // Segment 01: fixed 0vs1, 2vs3, 4vs5, 6vs7
  // Segment 02: based on ranking (1st vs 2nd, 3rd vs 4th, ...)
  segment: 1, // 1 or 2
  matchIndex: 0, // 0..3 within current segment
  matchupsSeg1: [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
  ],
  matchupsSeg2: null, // filled after Segment 01 ranking

  // Current active pair (school ids)
  activeA: null,
  activeB: null,

  // Question tracking
  currentQuestionInMatch: 0, // 0-based within current match
  questionsPerMatchR1: 10,
  questionsPerMatchR2: 12,
  questionStarted: false,
  optionsRevealed: false,
  revealed: false, // answer revealed
  timer: 15,
  timerRunning: false,
  interval: null,

  // Answer tracking for current question (Round 1)
  // order: [{ schoolId, answer, correct, timestamp }, ...]
  answerOrder: [],
  answers: {}, // schoolId -> answer index

  // Ranking
  rankingSeg1: [], // array of school ids high→low after Seg1
  rankingRound1: [], // after both segments
  qualifiers: [], // top 4 school ids

  // Round 2
  round2Matchups: null, // [[idA, idB], [idC, idD]]
  round2MatchIndex: 0,
  round2Scores: {}, // schoolId -> points
  // Current answering stage: "first_individual" | "second_individual" | "fellow_members" | "done"
  round2Stage: "first_individual",
  // Which school is first for this question (alternates)
  round2FirstSchool: null, // schoolId that gets Q1, Q3, ...
  round2SecondSchool: null,

  // Grand reveal
  grandRevealStep: 0, // 0=not started, 1=4th, 2=3rd, 3=2nd, 4=1st
  finalRanking: [], // [{id, name, points, place}, ...]

  // Global question pointer into questions.json (sequential allocation)
  globalQuestionIndex: 0,

  // Host helpers
  hostConnected: false,
};

module.exports = gameState;
