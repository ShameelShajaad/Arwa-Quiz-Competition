const gameState = {
    currentQuestion: 0,
    timer: 10,
    timerRunning: false,

    teams: [
        { id: "A", name: "Team A", score: 0 },
        { id: "B", name: "Team B", score: 0 },
        { id: "C", name: "Team C", score: 0 },
        { id: "D", name: "Team D", score: 0 }
    ],

    questions: [],

    interval: null
};

module.exports = gameState;