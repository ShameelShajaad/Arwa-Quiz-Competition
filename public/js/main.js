console.log("ARWA Quiz System Loaded");

const hostBtn = document.getElementById("hostBtn");
const teamBtn = document.getElementById("teamBtn");
const displayBtn = document.getElementById("displayBtn");

const teamModal = document.getElementById("teamModal");
const closeModal = document.getElementById("closeModal");

if (hostBtn) hostBtn.onclick = () => (location.href = "host.html");
if (displayBtn) displayBtn.onclick = () => (location.href = "display.html");

if (teamBtn) {
  teamBtn.onclick = () => {
    teamModal.classList.remove("hidden");
    teamModal.classList.add("flex");
  };
}

if (closeModal) {
  closeModal.onclick = () => {
    teamModal.classList.add("hidden");
    teamModal.classList.remove("flex");
  };
}

document.querySelectorAll(".team-chip").forEach((chip) => {
  chip.onclick = () => {
    const team = chip.getAttribute("data-team");
    location.href = `team.html?team=${team}`;
  };
});
