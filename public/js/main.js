const hostBtn = document.getElementById("hostBtn");
const teamBtn = document.getElementById("teamBtn");
const displayBtn = document.getElementById("displayBtn");
const teamModal = document.getElementById("teamModal");
const closeModal = document.getElementById("closeModal");
const schoolList = document.getElementById("schoolList");

if (hostBtn) hostBtn.onclick = () => { if (window.QuizSound) QuizSound.click(); location.href = "host.html"; };
if (displayBtn) displayBtn.onclick = () => { if (window.QuizSound) QuizSound.click(); location.href = "display.html"; };

let socket = null;

if (teamBtn) {
  teamBtn.onclick = () => {
    if (window.QuizSound) QuizSound.click();
    teamModal.classList.remove("hidden");
    teamModal.classList.add("flex");
    // connect briefly to get school names
    if (!socket) {
      socket = io({ transports: ["websocket"] });
      socket.on("connect", () => socket.emit("identify", { role: "display" }));
      socket.on("state", (st) => {
        if (!st.schools && !st.rankingSeg1NamesOnly) return;
        // request full via a lightweight approach: show from last known
      });
    }
    // Also try fetching names via a simple poll if host already set them
    fetchSchools();
  };
}

function fetchSchools() {
  // Use socket state if available; otherwise show placeholder
  if (!socket) {
    socket = io({ transports: ["websocket"] });
    socket.on("connect", () => {
      socket.emit("identify", { role: "display" });
    });
    socket.on("state", (st) => {
      renderSchoolButtons(st);
    });
  } else {
    socket.emit("identify", { role: "display" });
  }
}

function renderSchoolButtons(st) {
  const schools = st.schools || [];
  if (!schools.length || !schools.some(s => s.name)) {
    schoolList.innerHTML = '<p class="text-muted text-sm text-center">Waiting for Host to set the 8 school names…</p>';
    return;
  }
  schoolList.innerHTML = schools.map(s => `
    <button class="team-chip w-full text-left px-4 py-3" data-id="${s.id}">
      ${s.name || "School " + (s.id + 1)}
    </button>
  `).join("");
  schoolList.querySelectorAll(".team-chip").forEach(btn => {
    btn.onclick = () => {
      if (window.QuizSound) QuizSound.click();
      const id = btn.getAttribute("data-id");
      location.href = `team.html?schoolId=${id}`;
    };
  });
}

if (closeModal) {
  closeModal.onclick = () => {
    if (window.QuizSound) QuizSound.click();
    teamModal.classList.add("hidden");
    teamModal.classList.remove("flex");
  };
}
