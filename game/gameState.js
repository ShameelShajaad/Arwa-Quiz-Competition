const gameState = {
  currentQuestion: 0,
  timer: 10,
  timerRunning: false,

  teams: [
    { id: "A", score: 0, answer: null },
    { id: "B", score: 0, answer: null },
    { id: "C", score: 0, answer: null },
    { id: "D", score: 0, answer: null },
  ],

  questions: [],

  interval: null,
};

module.exports = gameState;
