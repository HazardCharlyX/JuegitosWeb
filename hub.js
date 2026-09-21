// hub.js - Interactive Logic and Sound Effects for Arcade Hub

document.addEventListener('DOMContentLoaded', () => {
    // Sound FX using Web Audio API for hub interactions
    let audioCtx = null;

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playBeep(freq = 440, type = 'sine', duration = 0.08) {
        try {
            initAudio();
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            // Silently ignore if blocked
        }
    }

    // Interactive button hover/clicks
    const playButtons = document.querySelectorAll('.game-card .play-btn');
    playButtons.forEach(btn => {
        btn.addEventListener('mouseenter', () => playBeep(580, 'triangle', 0.06));
        btn.addEventListener('click', () => playBeep(880, 'sine', 0.15));
    });

    const lockedCards = document.querySelectorAll('.game-card.locked');
    lockedCards.forEach(card => {
        card.addEventListener('click', () => {
            playBeep(180, 'sawtooth', 0.12);
            showHubToast("🔒 ¡Este juego está en los hornos de la cocina shitpost! Vuelve pronto.");
        });
    });

    // CRT Scanline Toggle
    const crtToggleBtn = document.getElementById('crt-toggle');
    const crtOverlay = document.getElementById('crt-overlay');
    if (crtToggleBtn && crtOverlay) {
        crtToggleBtn.addEventListener('click', () => {
            initAudio();
            playBeep(720, 'sine', 0.08);
            const isActive = crtOverlay.classList.toggle('active');
            crtToggleBtn.classList.toggle('active', isActive);
            crtToggleBtn.textContent = isActive ? '📺 Efecto CRT: ON' : '📺 Efecto CRT: OFF';
        });
    }

    // Hub Toast Notification
    const toast = document.getElementById('hub-toast');
    let toastTimer;
    function showHubToast(msg) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove('visible');
        }, 2500);
    }
});
