const socket = io({ transports: ["websocket"] });

const winnerTeamEl = document.getElementById("winnerTeam");
const winnerScoreEl = document.getElementById("winnerScore");

let rendered = false;

function renderWinner(winner) {
  if (!winner || rendered) return;
  rendered = true;

  winnerTeamEl.textContent = "TEAM " + winner.id;
  winnerScoreEl.textContent = `${winner.score} Points`;

  QuizSound.win();
  startConfetti();
}

socket.on("connect", () => socket.emit("identify", { role: "display" }));

// Fallback: winner passed via display.js redirect
const stored = sessionStorage.getItem("arwaWinner");
if (stored) {
  try {
    renderWinner(JSON.parse(stored));
  } catch (e) {}
}

// Live: winner page opened directly and quiz finishes while open
socket.on("quizFinished", (winner) => {
  if (winner) {
    sessionStorage.setItem("arwaWinner", JSON.stringify(winner));
    renderWinner(winner);
  }
});

// -----------------------------------------
// Lightweight confetti animation (no deps)
// -----------------------------------------
function startConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  const ctx = canvas.getContext("2d");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  const colors = ["#D4AF37", "#F4D03F", "#E8C766", "#F5EFE6", "#4A3420"];
  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    size: 6 + Math.random() * 8,
    speedY: 1.5 + Math.random() * 3,
    speedX: -1 + Math.random() * 2,
    rotation: Math.random() * 360,
    rotationSpeed: -6 + Math.random() * 12,
    color: colors[Math.floor(Math.random() * colors.length)],
    shape: Math.random() > 0.5 ? "rect" : "circle",
  }));

  let running = true;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(draw);
  });

  function draw() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pieces.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;

      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    requestAnimationFrame(draw);
  }

  draw();
}
