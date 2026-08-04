const socket = io();

let timer = 10;
let running = false;

const timerText = document.getElementById("timer");

document.getElementById("startBtn").onclick = () => {

    if(running) return;

    running = true;

    timer = 10;

    timerText.innerHTML = timer;

    socket.emit("startTimer");

    const interval = setInterval(()=>{

        timer--;

        timerText.innerHTML = timer;

        socket.emit("timer",timer);

        if(timer<=0){

            clearInterval(interval);

            running=false;

        }

    },1000);

};

document.getElementById("nextBtn").onclick=()=>{

    socket.emit("nextQuestion");

};

document.getElementById("correctBtn").onclick=()=>{

    socket.emit("correct");

};

document.getElementById("wrongBtn").onclick=()=>{

    socket.emit("wrong");

};