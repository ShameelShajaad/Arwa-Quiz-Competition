const socket = io();

let answered = false;

socket.on("timer",(time)=>{

document.getElementById("timer").innerHTML=time;

});

socket.on("question",(q)=>{

answered=false;

document.getElementById("question").innerHTML=q.question;

for(let i=0;i<4;i++){

const btn=document.getElementById("a"+i);

btn.innerHTML=q.options[i];

btn.disabled=false;

btn.onclick=()=>{

if(answered)return;

answered=true;

btn.style.background="#2ecc71";

socket.emit("answer",{

answer:i,

remainingTime:Number(document.getElementById("timer").innerHTML)

});

document.querySelectorAll(".answer").forEach(b=>{

b.disabled=true;

});

};

}

});