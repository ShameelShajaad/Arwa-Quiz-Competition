const socket = io({
    transports: ["websocket"]
});

document.getElementById("startBtn").onclick = () => {

    socket.emit("startTimer");

};

socket.on("timer", (time) => {

    document.getElementById("timer").innerHTML = time;

});

document.getElementById("revealBtn").onclick=()=>{

socket.emit("revealAnswer");

};