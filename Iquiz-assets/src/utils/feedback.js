import { $ } from './dom.js';

const defaultSettings = { sound: true, haptics: true };
let getSettings = () => defaultSettings;

const resolveSettings = () => {
  try {
    return getSettings() ?? defaultSettings;
  } catch {
    return defaultSettings;
  }
};

export function configureFeedback(getter) {
  if (typeof getter === 'function') {
    getSettings = getter;
  }
}

export function vibrate(pattern) {
  try {
    const settings = resolveSettings();
    if (settings.haptics && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

export function toast(html, ms = 2200) {
  const el = document.createElement('div');
  el.className =
    'fixed top-20 left-1/2 -translate-x-1/2 glass px-5 py-3 rounded-2xl text-white font-bold fade-in';
  el.style.zIndex = '999';
  el.innerHTML = html;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let audioCtx;
const ensureAudioContext = () => {
  if (audioCtx) return audioCtx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
};

const shouldPlaySound = () => {
  const settings = resolveSettings();
  return settings.sound !== false;
};

function beep(frequency = 880, duration = 0.12, type = 'sine') {
  if (!shouldPlaySound()) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.start();
  oscillator.stop(now + duration + 0.02);
}

export const SFX = {
  correct: () => {
    beep(880);
    setTimeout(() => beep(1320, 0.1, 'triangle'), 90);
  },
  wrong: () => beep(160, 0.25, 'sawtooth'),
  tick: () => beep(660, 0.05),
  coin: () => {
    beep(1200, 0.08);
    setTimeout(() => beep(1600, 0.08), 70);
  },
};

export function shootConfetti() {
  const canvas = $('#confetti');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = (canvas.width = window.innerWidth);
  const H = (canvas.height = window.innerHeight);
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * W,
    y: -20 - Math.random() * H,
    r: 4 + Math.random() * 6,
    c: ['#fde047', '#fb923c', '#a78bfa', '#ec4899', '#34d399'][Math.floor(Math.random() * 5)],
    v: 1 + Math.random() * 3,
    a: Math.random() * Math.PI * 2,
  }));
  let t = 0;
  let run = true;
  (function anim() {
    if (!run) return;
    ctx.clearRect(0, 0, W, H);
    for (const piece of pieces) {
      ctx.fillStyle = piece.c;
      ctx.beginPath();
      ctx.arc(piece.x, piece.y, piece.r, 0, Math.PI * 2);
      ctx.fill();
      piece.y += piece.v;
      piece.x += Math.sin(piece.a + t / 15);
      if (piece.y > H + 10) piece.y = -10;
    }
    t += 1;
    const id = requestAnimationFrame(anim);
    setTimeout(() => {
      run = false;
      cancelAnimationFrame(id);
      ctx.clearRect(0, 0, W, H);
    }, 2200);
  })();
}
