console.log("ARWA Quiz System Loaded");

const hostBtn = document.getElementById("hostBtn");
const teamBtn = document.getElementById("teamBtn");
const displayBtn = document.getElementById("displayBtn");

const teamModal = document.getElementById("teamModal");
const closeModal = document.getElementById("closeModal");

if (hostBtn) hostBtn.onclick = () => { QuizSound.click(); location.href = "host.html"; };
if (displayBtn) displayBtn.onclick = () => { QuizSound.click(); location.href = "display.html"; };

if (teamBtn) {
  teamBtn.onclick = () => {
    QuizSound.click();
    teamModal.classList.remove("hidden");
    teamModal.classList.add("flex");
  };
}

if (closeModal) {
  closeModal.onclick = () => {
    QuizSound.click();
    teamModal.classList.add("hidden");
    teamModal.classList.remove("flex");
  };
}

document.querySelectorAll(".team-chip").forEach((chip) => {
  chip.onclick = () => {
    QuizSound.click();
    const team = chip.getAttribute("data-team");
    location.href = `team.html?team=${team}`;
  };
});
