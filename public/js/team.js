const socket = io();

let team = "";

let answered = false;

socket.on("timer", (time) => {
  document.getElementById("timer").innerHTML = time;

  document.getElementById("joinBtn").onclick = () => {
    const selected = document.getElementById("teamSelect").value;

    if (!selected) {
      alert("Select your team.");
      return;
    }

    team = selected;

    document.getElementById("teamName").innerHTML = "TEAM " + team;

    socket.emit("joinTeam", team);

    document.getElementById("joinBtn").disabled = true;
    document.getElementById("teamSelect").disabled = true;
  };
});

socket.on("question", (q) => {
  answered = false;

  document.getElementById("question").innerHTML = q.question;

  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById("a" + i);

    btn.innerHTML = q.options[i];

    btn.disabled = false;

    btn.onclick = () => {
      if (answered) return;

      answered = true;

      btn.style.background = "#2ecc71";

      socket.emit("answer", {
        team: team,
        answer: i,
        remainingTime: Number(document.getElementById("timer").innerHTML),
      });

      document.querySelectorAll(".answer").forEach((b) => {
        b.disabled = true;
      });
    };
  }
});
