const socket = io();

socket.on("timer", (time) => {

    document.getElementById("timer").innerHTML = time;

});