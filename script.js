'use strict';

// BIRTHDAY EXPERIENCE — All graphics and interactions work without a framework.
const $ = (selector) => document.querySelector(selector);
const intro = $('#intro');
const site = $('#site');
const audio = $('#birthdayAudio');
const musicPlayer = $('#musicPlayer');
// Audio is segmented only for reliable static-file publishing; the original MP3 is reconstructed losslessly.
const musicParts = Array.from({length: 22}, (_, i) => 'assets/audio/part-' + String(i).padStart(2, '0') + '.bin');
const musicReady = Promise.all(musicParts.map(async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Missing audio part: ' + url);
  return response.blob();
})).then((parts) => {
  audio.src = URL.createObjectURL(new Blob(parts, { type: 'audio/mpeg' }));
  audio.load();
}).catch(() => { showToast('La musique ne se charge pas. Réessaie.'); });

const musicToggle = $('#musicToggle');
const equalizer = $('#equalizer');
const progress = $('#musicProgress');
const modal = $('#giftModal');
const toast = $('#toast');
const canvas = $('#confetti');
const ctx = canvas.getContext('2d');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let started = false;
let toastTimer;
let particles = [];
let frame = 0;
let raf = 0;
let deviceScale = 1;

function sizeCanvas() {
  deviceScale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * deviceScale);
  canvas.height = Math.round(window.innerHeight * deviceScale);
  ctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
}
sizeCanvas();
window.addEventListener('resize', sizeCanvas, { passive: true });

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('shown'), 3200);
}

const colors = ['#ff70b4', '#ffdc89', '#fff8ee', '#bbffd7', '#b39bff', '#ff9f86', '#f7aacd'];
function addBurst(x = window.innerWidth / 2, y = window.innerHeight / 2, count = 95) {
  if (prefersReducedMotion) return;
  count = Math.min(count, 260);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 8.5;
    particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1.7,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 6.5,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - .5) * .2,
      life: 0, maxLife: 70 + Math.random() * 90,
      shape: Math.random() > .3 ? 'rect' : 'circle'
    });
  }
  if (particles.length > 1400) particles.splice(0, particles.length - 1400);
  if (!raf) raf = requestAnimationFrame(drawConfetti);
}
function drawConfetti() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  frame++;
  particles = particles.filter((p) => p.life < p.maxLife && p.y < window.innerHeight + 80);
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= .991;
    p.vy += .125;
    p.rotation += p.spin;
    p.life++;
    const alpha = Math.min(1, (p.maxLife - p.life) / 30);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.7);
    else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  if (particles.length) raf = requestAnimationFrame(drawConfetti);
  else { raf = 0; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
}
function confettiParty() {
  addBurst(window.innerWidth * .22, window.innerHeight * .29, 110);
  setTimeout(() => addBurst(window.innerWidth * .78, window.innerHeight * .32, 130), 240);
  setTimeout(() => addBurst(window.innerWidth * .50, window.innerHeight * .35, 140), 470);
}
function floatingParty() {
  if (prefersReducedMotion) return;
  const box = $('#floaties');
  const symbols = ['🎈', '✨', '🍒', '🎉', '💗', '⭐', '🎈', '🎀'];
  for (let i = 0; i < 25; i++) {
    const e = document.createElement('span');
    e.className = 'floaty';
    e.textContent = symbols[i % symbols.length];
    e.style.setProperty('--left', `${Math.random() * 95}%`);
    e.style.setProperty('--size', `${18 + Math.random() * 35}px`);
    e.style.setProperty('--dur', `${8 + Math.random() * 9}s`);
    e.style.setProperty('--delay', `${Math.random() * 5}s`);
    e.style.setProperty('--drift', `${(Math.random() - .5) * 200}px`);
    box.appendChild(e);
    e.addEventListener('animationend', () => e.remove(), { once: true });
  }
}

function reflectPlayback() {
  const playing = !audio.paused;
  musicToggle.textContent = playing ? 'Ⅱ' : '▶';
  musicToggle.setAttribute('aria-label', playing ? 'Mettre la musique en pause' : 'Reprendre la musique');
  equalizer.classList.toggle('paused', !playing);
}
async function begin() {
  if (started) return;
  started = true;
  site.inert = false;
  site.classList.add('ready');
  intro.classList.add('leaving');
  musicPlayer.classList.add('visible');
  // This audio is the exact MP3 supplied by the user. Browsers require a click first.
  audio.volume = .75;
  try { await musicReady; await audio.play(); }
  catch { showToast('Clique sur ▶ pour lancer la musique 🎵'); }
  reflectPlayback();
  confettiParty();
  floatingParty();
  setTimeout(() => { intro.hidden = true; }, 980);
  observeReveals();
}
$('#startBtn').addEventListener('click', begin);

musicToggle.addEventListener('click', async () => {
  if (audio.paused) {
    try { await musicReady; await audio.play(); } catch { showToast('La musique est bloquée par le navigateur.'); }
  } else audio.pause();
  reflectPlayback();
});
audio.addEventListener('play', reflectPlayback);
audio.addEventListener('pause', reflectPlayback);
audio.addEventListener('timeupdate', () => {
  progress.style.width = audio.duration ? `${Math.min(100, audio.currentTime / audio.duration * 100)}%` : '0%';
});
audio.addEventListener('error', () => showToast('Fichier audio introuvable. Vérifie le dossier assets.'));

function openGift() {
  if (modal.open) return;
  modal.showModal();
  addBurst(window.innerWidth / 2, window.innerHeight * .32, 220);
  setTimeout(() => addBurst(window.innerWidth * .5, window.innerHeight * .48, 100), 350);
}
for (const id of ['#navGiftBtn', '#heroGiftBtn', '#giftBtn']) $(id).addEventListener('click', openGift);
$('#closeGiftBtn').addEventListener('click', () => modal.close());
modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
$('#modalCelebrateBtn').addEventListener('click', () => {
  modal.close();
  confettiParty();
  showToast('Joyeux anniversaire Apah !! 🎉');
});

$('#wishBtn').addEventListener('click', () => {
  const cakeScene = $('#cakeScene');
  if (cakeScene.classList.contains('blown')) {
    cakeScene.classList.remove('blown');
    $('#wishBtn').innerHTML = 'SOUFFLER LES BOUGIES <span aria-hidden="true">↗</span>';
    $('#wishDesc').textContent = 'Chaque anniversaire mérite un vœu. Clique et souffle les bougies !';
    showToast('Les bougies sont rallumées ✨');
    return;
  }
  cakeScene.classList.add('blown');
  $('#wishBtn').innerHTML = 'RALLUMER LES BOUGIES <span aria-hidden="true">↗</span>';
  $('#wishDesc').textContent = 'Ton vœu est en route. Que du bonheur pour toi ! 🌟';
  confettiParty();
  showToast('Un vœu pour Apah ! 🌟');
});
for (const id of ['#heroCelebrateBtn', '#vibesBtn', '#againBtn']) {
  $(id).addEventListener('click', () => {
    confettiParty();
    if (id === '#vibesBtn') showToast('GOOD VIBES SENT! 💖');
  });
}
$('#toTopBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

function observeReveals() {
  const elements = document.querySelectorAll('.reveal');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('in-view'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: .12, rootMargin: '0px 0px -20px 0px' });
  elements.forEach(el => observer.observe(el));
}
window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'm' && !modal.open && started && !e.repeat) {
    musicToggle.click();
  }
});