const gameState = {
  currentQuestion: 0,
  timer: 10,
  timerRunning: false,

  // Tracks whether the host has pressed START for the current question yet.
  // Lets late-joining / refreshed clients know whether to show "waiting" or the live question.
  questionStarted: false,

  // Tracks whether the host has pressed REVEAL for the current question yet.
  revealed: false,

  teams: [
    { id: "A", score: 0, answer: null, lastAnswer: null, remainingTime: 0 },
    { id: "B", score: 0, answer: null, lastAnswer: null, remainingTime: 0 },
    { id: "C", score: 0, answer: null, lastAnswer: null, remainingTime: 0 },
    { id: "D", score: 0, answer: null, lastAnswer: null, remainingTime: 0 },
  ],

  questions: [],

  interval: null,
};

module.exports = gameState;
