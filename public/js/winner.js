const socket = io({ transports: ["websocket"] });
socket.on("connect", () => socket.emit("identify", { role: "display" }));
socket.on("state", (st) => {
  if (st.finalRanking && st.finalRanking.length) {
    const champ = st.finalRanking.find((r) => r.place === 1) || st.finalRanking[0];
    document.getElementById("winnerName").textContent = champ.name;
    document.getElementById("winnerPts").textContent = (champ.points || 0) + " points";
  }
});
socket.on("grandReveal", (d) => {
  if (d.isChampion) {
    document.getElementById("winnerName").textContent = d.school;
    document.getElementById("winnerPts").textContent = d.points + " points";
  }
});
