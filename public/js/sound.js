/* =========================================================
   ARWA QUIZ — Sound Engine
   Web Audio API + optional click mp3 fallback
   ========================================================= */

const QuizSound = (() => {
  let ctx = null;
  let unlocked = false;
  let muted = localStorage.getItem("arwaSoundMuted") === "true";
  let clickAudio = null;

  function getCtx() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    const c = getCtx();
    if (!c) return;
    try {
      // silent buffer to unlock audio on iOS/Chrome
      const buf = c.createBuffer(1, 1, 22050);
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      src.start(0);
    } catch (e) {}
    // preload click mp3
    try {
      clickAudio = new Audio("assets/sounds/clickSound.mp3");
      clickAudio.volume = 0.4;
      clickAudio.load();
    } catch (e) {}
  }

  // Unlock on first user gesture
  ["pointerdown", "touchstart", "keydown", "click"].forEach((ev) => {
    document.addEventListener(ev, unlock, { once: true, capture: true });
  });

  function tone(freq, start, duration, type = "sine", peak = 0.18) {
    if (muted) return;
    try {
      const c = getCtx();
      if (!c) return;
      unlock();
      const osc = c.createOscillator();
      const gain = c.createGain();
      const t0 = c.currentTime + Math.max(0, start);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(peak, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.04, duration));

      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    } catch (e) {
      /* fail silently */
    }
  }

  function playMp3Click() {
    if (muted) return false;
    try {
      if (!clickAudio) {
        clickAudio = new Audio("assets/sounds/clickSound.mp3");
        clickAudio.volume = 0.4;
      }
      clickAudio.currentTime = 0;
      const p = clickAudio.play();
      if (p && p.catch) p.catch(() => {});
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    unlock,
    click() {
      unlock();
      // Prefer short synth beep; also try mp3
      tone(720, 0, 0.07, "square", 0.12);
      playMp3Click();
    },
    tick() {
      unlock();
      tone(880, 0, 0.05, "sine", 0.12);
    },
    questionStart() {
      unlock();
      tone(440, 0, 0.12, "triangle", 0.14);
      tone(660, 0.1, 0.16, "triangle", 0.14);
      tone(880, 0.2, 0.22, "triangle", 0.16);
    },
    reveal() {
      unlock();
      tone(392, 0, 0.1, "square", 0.14);
      tone(494, 0.08, 0.14, "square", 0.14);
    },
    correct() {
      unlock();
      tone(523.25, 0, 0.12, "sine", 0.18);
      tone(659.25, 0.1, 0.12, "sine", 0.18);
      tone(783.99, 0.2, 0.22, "sine", 0.2);
    },
    wrong() {
      unlock();
      tone(220, 0, 0.2, "sawtooth", 0.14);
      tone(174, 0.14, 0.28, "sawtooth", 0.12);
    },
    timeUp() {
      unlock();
      tone(300, 0, 0.16, "square", 0.16);
      tone(220, 0.14, 0.28, "square", 0.14);
    },
    win() {
      unlock();
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(f, i * 0.14, 0.4, "triangle", 0.2)
      );
    },
    toggleMute() {
      muted = !muted;
      localStorage.setItem("arwaSoundMuted", muted ? "true" : "false");
      if (!muted) {
        unlock();
        this.click();
      }
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
  btn.title = "Toggle sound";

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const m = QuizSound.toggleMute();
    btn.textContent = m ? "🔇" : "🔊";
  });

  document.body.appendChild(btn);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountSoundToggle);
} else {
  mountSoundToggle();
}

// Expose globally
window.QuizSound = QuizSound;
