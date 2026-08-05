const socket = io({
  transports: ["websocket"],
});

const params = new URLSearchParams(window.location.search);
const team = params.get("team");

document.getElementById("teamName").innerHTML = "TEAM " + team;

socket.emit("joinTeam", team);

let answered = false;

// ---------- TIMER ----------
socket.on("timer", (time) => {
  document.getElementById("timer").innerHTML = time;
});

// ---------- QUESTION ----------
socket.on("question", (q) => {
  console.log("QUESTION RECEIVED");
  console.log(q);

  answered = false;

  document.getElementById("question").innerHTML = q.question;

  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById("a" + i);

    btn.innerHTML = q.options[i];

    btn.disabled = false;

    btn.onclick = () => {
      if (team === "") {
        alert("Please join first.");
        return;
      }

      if (answered) return;

      answered = true;

      socket.emit("answer", {
        team,

        answer: i,

        remainingTime: Number(document.getElementById("timer").innerHTML),
      });

      document.querySelectorAll(".answer").forEach((b) => (b.disabled = true));
    };
  }
});

socket.on("correctAnswer", (correct) => {
  document.querySelectorAll(".answer").forEach((btn) => {
    btn.disabled = true;
    btn.style.background = "";
  });

  document.getElementById("a" + correct).style.background = "green";
});

socket.on("questionChanged", (data) => {
  document.getElementById("questionNo").innerHTML =
    `Question ${data.currentQuestion + 1}`;

  document.getElementById("question").innerHTML = "Waiting for Host...";

  document.querySelectorAll(".answer").forEach((btn) => {
    btn.innerHTML = "";
    btn.disabled = true;
    btn.style.background = "";
  });

  document.getElementById("timer").innerHTML = "10";

  document.getElementById("leaderboard").style.display="none";
});

socket.on("showLeaderboard", (teams) => {

    teams.sort((a,b)=>b.score-a.score);

    let html="<h2>🏆 LIVE SCORES</h2>";

    teams.forEach((team,index)=>{

        const medal=[
            "🥇",
            "🥈",
            "🥉",
            "4️⃣"
        ];

        html+=`
        <div class="scoreRow">
            ${medal[index]} Team ${team.id} - ${team.score}
        </div>
        `;

    });

    const board=document.getElementById("leaderboard");

    board.innerHTML=html;
    board.style.display="block";

});