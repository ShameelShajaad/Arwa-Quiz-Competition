/* =========================================================
   ARWA QUIZ — Sound Engine
   Synthesized via Web Audio API (no external audio files,
   so nothing to go missing/dead on another machine).
   ========================================================= */

const QuizSound = (() => {
  let ctx = null;
  let muted = localStorage.getItem("arwaSoundMuted") === "true";

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, start, duration, type = "sine", peak = 0.2) {
    if (muted) return;
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime + start);

      gain.gain.setValueAtTime(0, c.currentTime + start);
      gain.gain.linearRampToValueAtTime(peak, c.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + duration);

      osc.connect(gain).connect(c.destination);
      osc.start(c.currentTime + start);
      osc.stop(c.currentTime + start + duration + 0.05);
    } catch (e) {
      /* Web Audio unavailable — fail silently, never break the app */
    }
  }

  return {
    click() {
      tone(720, 0, 0.08, "square", 0.12);
    },
    tick() {
      tone(880, 0, 0.06, "sine", 0.14);
    },
    questionStart() {
      tone(440, 0, 0.15, "triangle", 0.16);
      tone(660, 0.12, 0.2, "triangle", 0.16);
      tone(880, 0.24, 0.3, "triangle", 0.18);
    },
    reveal() {
      tone(392, 0, 0.12, "square", 0.16);
      tone(494, 0.09, 0.18, "square", 0.16);
    },
    correct() {
      tone(523.25, 0, 0.15, "sine", 0.2);
      tone(659.25, 0.12, 0.15, "sine", 0.2);
      tone(783.99, 0.24, 0.28, "sine", 0.22);
    },
    wrong() {
      tone(220, 0, 0.25, "sawtooth", 0.16);
      tone(174, 0.16, 0.32, "sawtooth", 0.14);
    },
    timeUp() {
      tone(300, 0, 0.2, "square", 0.18);
      tone(220, 0.18, 0.35, "square", 0.16);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(f, i * 0.16, 0.45, "triangle", 0.22)
      );
    },
    toggleMute() {
      muted = !muted;
      localStorage.setItem("arwaSoundMuted", muted);
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
})();

function mountSoundToggle() {
  if (document.getElementById("soundToggle")) return;

  const btn = document.createElement("button");
  btn.id = "soundToggle";
  btn.className = "sound-toggle";
  btn.type = "button";
  btn.setAttribute("aria-label", "Toggle sound effects");
  btn.textContent = QuizSound.isMuted() ? "🔇" : "🔊";

  btn.onclick = () => {
    const m = QuizSound.toggleMute();
    btn.textContent = m ? "🔇" : "🔊";
    if (!m) QuizSound.click();
  };

  document.body.appendChild(btn);
}

document.addEventListener("DOMContentLoaded", mountSoundToggle);
