const socket=io();

const timer=document.getElementById("timer");

socket.on("timer",(value)=>{

timer.innerHTML=value;

});