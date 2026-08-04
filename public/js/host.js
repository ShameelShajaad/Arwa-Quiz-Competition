const socket = io();

document.getElementById("startBtn").onclick = () => {

    socket.emit("startTimer");

};

socket.on("timer", (time) => {

    document.getElementById("timer").innerHTML = time;

});