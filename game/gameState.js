/**
 * ARWA Quiz Competition — Game State
 * Variable number of schools (2–8), manual pairings, full tournament
 */

const gameState = {
  // setup | seg1_pairing | segment1 | segment1_ranking |
  // seg2_pairing | segment2 | round1_final |
  // round2_pairing | round2 | grand_reveal | finished
  phase: "setup",

  schoolCount: 8, // host chooses 2–8
  schools: [], // filled when host sets names: { id, name, scoreSeg1, scoreSeg2, scoreRound1, scoreRound2, connected }

  segment: 1,
  matchIndex: 0,
  matchupsSeg1: null, // [[idA,idB], ...] host-defined or auto
  matchupsSeg2: null, // host-defined after Seg1 ranking

  activeA: null,
  activeB: null,

  currentQuestionInMatch: 0,
  questionsPerMatchR1: 10,
  questionsPerMatchR2: 12,
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
  hostConnected: false,
};

module.exports = gameState;
