const socket = io();

socket.on("timer",(time)=>{

document.getElementById("timer").innerHTML=time;

});

socket.on("question",(q)=>{

document.getElementById("question").innerHTML=q.question;

for(let i=0;i<4;i++){

document.getElementById("a"+i).innerHTML=q.options[i];

}

});