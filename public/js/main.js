const hostBtn = document.getElementById("hostBtn");
const teamBtn = document.getElementById("teamBtn");
const displayBtn = document.getElementById("displayBtn");
const teamModal = document.getElementById("teamModal");
const closeModal = document.getElementById("closeModal");
const schoolList = document.getElementById("schoolList");

if (hostBtn) hostBtn.onclick = () => { if (window.QuizSound) QuizSound.click(); location.href = "host.html"; };
if (displayBtn) displayBtn.onclick = () => { if (window.QuizSound) QuizSound.click(); location.href = "display.html"; };

let socket = null;

function ensureSocket() {
  if (socket) return socket;
  socket = io({ transports: ["websocket"] });
  socket.on("connect", () => {
    socket.emit("identify", { role: "display" });
  });
  socket.on("state", (st) => {
    renderSchoolButtons(st);
  });
  return socket;
}

function renderSchoolButtons(st) {
  if (!schoolList) return;
  const schools = (st.schools || []).filter((s) => s.name && String(s.name).trim());
  if (!schools.length) {
    schoolList.innerHTML = '<p class="text-muted text-sm text-center">Waiting for Host to set school names…</p>';
    return;
  }
  schoolList.innerHTML = schools.map((s) => `
    <button class="team-chip w-full text-left px-4 py-3" data-id="${s.id}">
      ${s.name}
    </button>
  `).join("");
  schoolList.querySelectorAll(".team-chip").forEach((btn) => {
    btn.onclick = () => {
      if (window.QuizSound) QuizSound.click();
      const id = btn.getAttribute("data-id");
      location.href = `team.html?schoolId=${id}`;
    };
  });
}

if (teamBtn) {
  teamBtn.onclick = () => {
    if (window.QuizSound) QuizSound.click();
    teamModal.classList.remove("hidden");
    teamModal.classList.add("flex");
    ensureSocket();
    // force re-identify to get latest state
    if (socket.connected) socket.emit("identify", { role: "display" });
  };
}

if (closeModal) {
  closeModal.onclick = () => {
    if (window.QuizSound) QuizSound.click();
    teamModal.classList.add("hidden");
    teamModal.classList.remove("flex");
  };
}


function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.() || document.documentElement.webkitRequestFullscreen?.();
  } else {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  }
}
document.getElementById("fsBtn")?.addEventListener("click", () => {
  if (window.QuizSound) QuizSound.click();
  toggleFullscreen();
});
