const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection",(socket)=>{

console.log("Connected");

socket.on("timer",(time)=>{

io.emit("timer",time);

});

socket.on("startTimer",()=>{

io.emit("startTimer");

});

socket.on("nextQuestion",()=>{

io.emit("nextQuestion");

});

socket.on("correct",()=>{

io.emit("correct");

});

socket.on("wrong",()=>{

io.emit("wrong");

});

});

const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});