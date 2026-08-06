const socket = io({
    transports:["websocket"]
});

socket.on("question",(q)=>{

document.getElementById("question").innerHTML=q.question;

document.getElementById("o0").innerHTML="A. "+q.options[0];
document.getElementById("o1").innerHTML="B. "+q.options[1];
document.getElementById("o2").innerHTML="C. "+q.options[2];
document.getElementById("o3").innerHTML="D. "+q.options[3];

});

socket.on("timer",(time)=>{

document.getElementById("timer").innerHTML=time;

});

socket.on("correctAnswer",(correct)=>{

document
.querySelectorAll(".option")
.forEach(x=>x.classList.remove("correct"));

document
.getElementById("o"+correct)
.classList.add("correct");

});

socket.on("questionChanged",(data)=>{

document.getElementById("questionNo").innerHTML=
`Question ${data.currentQuestion+1}`;

document
.querySelectorAll(".option")
.forEach(x=>x.classList.remove("correct"));

});

socket.on("showLeaderboard",(teams)=>{

teams.sort((a,b)=>b.score-a.score);

let html="<h2>🏆 LIVE SCORES</h2>";

teams.forEach((team,index)=>{

const medal=["🥇","🥈","🥉","4️⃣"];

html+=`
<div style="font-size:35px;margin:15px;">
${medal[index]} Team ${team.id} - ${team.score}
</div>
`;

});

document.getElementById("leaderboard").innerHTML=html;

});

socket.on("quizFinished",(winner)=>{

document.body.innerHTML=`
<h1 style="font-size:90px;">🏆 WINNER 🏆</h1>

<h1 style="font-size:120px;">
TEAM ${winner.id}
</h1>

<h2 style="font-size:60px;">
${winner.score} Points
</h2>
`;

});