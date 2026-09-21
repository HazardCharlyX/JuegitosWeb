// game.js - Main Game Controller, Skins, Effects, and Upgrades

document.addEventListener('DOMContentLoaded', () => {
    const spinnerElement = document.getElementById('spinner');
    const spinnerContainer = document.getElementById('spinner-container');
    const particleCanvas = document.getElementById('particle-canvas');
    const ctxParticles = particleCanvas.getContext('2d');

    // UI elements
    const rpmValueEl = document.getElementById('rpm-value');
    const rpmGaugeFill = document.getElementById('rpm-gauge-fill');
    const maxRpmEl = document.getElementById('max-rpm-value');
    const totalSpinsEl = document.getElementById('total-spins-value');
    const speedStatusEl = document.getElementById('speed-status');
    const muteBtn = document.getElementById('mute-btn');
    const raveBtn = document.getElementById('rave-btn');
    const wd40Btn = document.getElementById('wd40-btn');
    const turboBtn = document.getElementById('turbo-btn');
    const blowBtn = document.getElementById('blow-btn');
    const brakeBtn = document.getElementById('brake-btn');
    const skinSelectContainer = document.getElementById('skin-selector');
    const memeBanner = document.getElementById('meme-banner');

    const physics = window.spinnerPhysics;
    const audio = window.spinnerAudio;

    // Resize canvas
    function resizeCanvas() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
        updateCenter();
    }
    window.addEventListener('resize', resizeCanvas);

    function updateCenter() {
        const rect = spinnerContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const radius = rect.width / 2;
        physics.setCenter(centerX, centerY, radius);
    }
    setTimeout(updateCenter, 100);

    // Particles array
    const particles = [];
    const shockwaves = [];

    // Upgrades state
    let isRaveActive = false;
    let isTurboActive = false;
    let isBraking = false;
    let currentSkin = 'classic';
    let brokenMach1 = false;
    let brokenMach2 = false;

    // --- SKINS DEFINITIONS (Custom SVG Graphic Generators) ---
    const SKINS = {
        classic: {
            name: "RGB Gamer 3000",
            icon: "🌈",
            desc: "Triple aspa gamer con rodamientos cerámicos e iluminación RGB.",
            render: () => `
                <svg viewBox="-180 -180 360 360" class="spinner-svg">
                    <defs>
                        <radialGradient id="bearingGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stop-color="#ffffff"/>
                            <stop offset="60%" stop-color="#94a3b8"/>
                            <stop offset="100%" stop-color="#334155"/>
                        </radialGradient>
                        <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#ec4899"/>
                            <stop offset="50%" stop-color="#8b5cf6"/>
                            <stop offset="100%" stop-color="#06b6d4"/>
                        </linearGradient>
                        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#8b5cf6" flood-opacity="0.8"/>
                        </filter>
                    </defs>
                    <!-- Body Shape: 3 lobes -->
                    <g filter="url(#neonGlow)">
                        <path d="
                            M 0 -130 
                            C 45 -130 55 -60 70 -35
                            C 112 -60 148 -10 112 50
                            C 85 80 50 65 30 75
                            C -20 140 -90 120 -110 60
                            C -130 10 -90 -40 -60 -40
                            C -50 -70 -35 -130 0 -130 Z" 
                            fill="url(#bladeGrad)" 
                            stroke="#ffffff" 
                            stroke-width="3"
                        />
                    </g>
                    <!-- 3 Outer Weights / Bearings -->
                    <!-- Lobe 1 (Top) -->
                    <circle cx="0" cy="-90" r="26" fill="#0f172a" stroke="#38bdf8" stroke-width="4"/>
                    <circle cx="0" cy="-90" r="16" fill="url(#bearingGrad)" stroke="#1e293b" stroke-width="2"/>
                    <circle cx="0" cy="-90" r="7" fill="#0284c7"/>

                    <!-- Lobe 2 (Bottom Right, 120 deg) -->
                    <g transform="rotate(120)">
                        <circle cx="0" cy="-90" r="26" fill="#0f172a" stroke="#a855f7" stroke-width="4"/>
                        <circle cx="0" cy="-90" r="16" fill="url(#bearingGrad)" stroke="#1e293b" stroke-width="2"/>
                        <circle cx="0" cy="-90" r="7" fill="#9333ea"/>
                    </g>

                    <!-- Lobe 3 (Bottom Left, 240 deg) -->
                    <g transform="rotate(240)">
                        <circle cx="0" cy="-90" r="26" fill="#0f172a" stroke="#ec4899" stroke-width="4"/>
                        <circle cx="0" cy="-90" r="16" fill="url(#bearingGrad)" stroke="#1e293b" stroke-width="2"/>
                        <circle cx="0" cy="-90" r="7" fill="#db2777"/>
                    </g>

                    <!-- Central Bearing Hub -->
                    <circle cx="0" cy="0" r="38" fill="#0f172a" stroke="#ffffff" stroke-width="4"/>
                    <circle cx="0" cy="0" r="28" fill="url(#bearingGrad)"/>
                    <circle cx="0" cy="0" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
                    <!-- Little center logo -->
                    <polygon points="0,-8 7,5 -7,5" fill="#38bdf8"/>
                </svg>
            `
        },

        doge: {
            name: "Doge Spinner",
            icon: "🐕",
            desc: "Much spin. Very RPM. So inercia. Wow.",
            render: () => `
                <svg viewBox="-180 -180 360 360" class="spinner-svg">
                    <defs>
                        <radialGradient id="dogeGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stop-color="#fef08a"/>
                            <stop offset="100%" stop-color="#ca8a04"/>
                        </radialGradient>
                    </defs>
                    <!-- Golden frame -->
                    <path d="M0 -115 C 40 -115 50 -55 80 -35 C 125 -65 145 -10 105 50 C 70 85 45 65 20 80 C -30 145 -100 115 -105 55 C -135 15 -80 -45 -55 -45 C -45 -80 -35 -115 0 -115 Z" fill="#eab308" stroke="#713f12" stroke-width="5"/>
                    
                    <!-- 3 Doge Faces -->
                    <!-- Doge 1 (Top) -->
                    <g transform="translate(0, -85) scale(0.65)">
                        <circle cx="0" cy="0" r="36" fill="url(#dogeGrad)" stroke="#854d0e" stroke-width="3"/>
                        <!-- Ears -->
                        <polygon points="-28,-20 -38,-45 -12,-30" fill="#a16207"/>
                        <polygon points="28,-20 38,-45 12,-30" fill="#a16207"/>
                        <!-- Eyes -->
                        <ellipse cx="-12" cy="-6" rx="5" ry="6" fill="#1e293b"/>
                        <ellipse cx="12" cy="-6" rx="5" ry="6" fill="#1e293b"/>
                        <circle cx="-10" cy="-8" r="2" fill="#fff"/>
                        <circle cx="14" cy="-8" r="2" fill="#fff"/>
                        <!-- Snout -->
                        <ellipse cx="0" cy="10" rx="14" ry="10" fill="#fef9c3"/>
                        <polygon points="-4,6 4,6 0,11" fill="#0f172a"/>
                        <!-- Eyebrows -->
                        <path d="M-18 -15 Q-12 -20 -6 -15" stroke="#78350f" stroke-width="2" fill="none"/>
                        <path d="M6 -15 Q12 -20 18 -15" stroke="#78350f" stroke-width="2" fill="none"/>
                    </g>

                    <!-- Doge 2 (120 deg) -->
                    <g transform="rotate(120) translate(0, -85) scale(0.65)">
                        <circle cx="0" cy="0" r="36" fill="url(#dogeGrad)" stroke="#854d0e" stroke-width="3"/>
                        <polygon points="-28,-20 -38,-45 -12,-30" fill="#a16207"/>
                        <polygon points="28,-20 38,-45 12,-30" fill="#a16207"/>
                        <ellipse cx="-12" cy="-6" rx="5" ry="6" fill="#1e293b"/>
                        <ellipse cx="12" cy="-6" rx="5" ry="6" fill="#1e293b"/>
                        <circle cx="-10" cy="-8" r="2" fill="#fff"/>
                        <circle cx="14" cy="-8" r="2" fill="#fff"/>
                        <ellipse cx="0" cy="10" rx="14" ry="10" fill="#fef9c3"/>
                        <polygon points="-4,6 4,6 0,11" fill="#0f172a"/>
                    </g>

                    <!-- Doge 3 (240 deg) -->
                    <g transform="rotate(240) translate(0, -85) scale(0.65)">
                        <circle cx="0" cy="0" r="36" fill="url(#dogeGrad)" stroke="#854d0e" stroke-width="3"/>
                        <polygon points="-28,-20 -38,-45 -12,-30" fill="#a16207"/>
                        <polygon points="28,-20 38,-45 12,-30" fill="#a16207"/>
                        <ellipse cx="-12" cy="-6" rx="5" ry="6" fill="#1e293b"/>
                        <ellipse cx="12" cy="-6" rx="5" ry="6" fill="#1e293b"/>
                        <circle cx="-10" cy="-8" r="2" fill="#fff"/>
                        <circle cx="14" cy="-8" r="2" fill="#fff"/>
                        <ellipse cx="0" cy="10" rx="14" ry="10" fill="#fef9c3"/>
                        <polygon points="-4,6 4,6 0,11" fill="#0f172a"/>
                    </g>

                    <!-- Center Coin -->
                    <circle cx="0" cy="0" r="36" fill="#f59e0b" stroke="#fff" stroke-width="4"/>
                    <text x="0" y="10" font-family="'Comic Sans MS', cursive, sans-serif" font-weight="bold" font-size="24" fill="#fff" text-anchor="middle">Ð</text>
                </svg>
            `
        },

        chicken: {
            name: "Pollo Chillón",
            icon: "🐔",
            desc: "3 pollos de goma chillones atados a un rodamiento. Una pesadilla sonora.",
            render: () => `
                <svg viewBox="-180 -180 360 360" class="spinner-svg">
                    <defs>
                        <linearGradient id="rubberGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#facc15"/>
                            <stop offset="100%" stop-color="#eab308"/>
                        </linearGradient>
                    </defs>
                    <!-- Chicken Arms -->
                    <g transform="rotate(0)">
                        <rect x="-14" y="-120" width="28" height="90" rx="14" fill="url(#rubberGrad)" stroke="#ca8a04" stroke-width="3"/>
                        <!-- Head -->
                        <ellipse cx="0" cy="-115" rx="22" ry="26" fill="#facc15" stroke="#ca8a04" stroke-width="3"/>
                        <!-- Crest -->
                        <path d="M-6 -140 Q0 -150 6 -140 Q10 -155 16 -140" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
                        <!-- Wide Open Beak Screaming -->
                        <ellipse cx="0" cy="-105" rx="14" ry="16" fill="#dc2626"/>
                        <polygon points="-12,-114 12,-114 0,-98" fill="#f97316"/>
                        <!-- Crazy Googly Eyes -->
                        <circle cx="-9" cy="-122" r="7" fill="#fff" stroke="#000" stroke-width="1.5"/>
                        <circle cx="-8" cy="-124" r="3" fill="#000"/>
                        <circle cx="9" cy="-122" r="7" fill="#fff" stroke="#000" stroke-width="1.5"/>
                        <circle cx="7" cy="-121" r="3" fill="#000"/>
                    </g>
                    <g transform="rotate(120)">
                        <rect x="-14" y="-120" width="28" height="90" rx="14" fill="url(#rubberGrad)" stroke="#ca8a04" stroke-width="3"/>
                        <ellipse cx="0" cy="-115" rx="22" ry="26" fill="#facc15" stroke="#ca8a04" stroke-width="3"/>
                        <path d="M-6 -140 Q0 -150 6 -140 Q10 -155 16 -140" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
                        <ellipse cx="0" cy="-105" rx="14" ry="16" fill="#dc2626"/>
                        <polygon points="-12,-114 12,-114 0,-98" fill="#f97316"/>
                        <circle cx="-9" cy="-122" r="7" fill="#fff" stroke="#000" stroke-width="1.5"/>
                        <circle cx="-8" cy="-124" r="3" fill="#000"/>
                        <circle cx="9" cy="-122" r="7" fill="#fff" stroke="#000" stroke-width="1.5"/>
                        <circle cx="7" cy="-121" r="3" fill="#000"/>
                    </g>
                    <g transform="rotate(240)">
                        <rect x="-14" y="-120" width="28" height="90" rx="14" fill="url(#rubberGrad)" stroke="#ca8a04" stroke-width="3"/>
                        <ellipse cx="0" cy="-115" rx="22" ry="26" fill="#facc15" stroke="#ca8a04" stroke-width="3"/>
                        <path d="M-6 -140 Q0 -150 6 -140 Q10 -155 16 -140" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
                        <ellipse cx="0" cy="-105" rx="14" ry="16" fill="#dc2626"/>
                        <polygon points="-12,-114 12,-114 0,-98" fill="#f97316"/>
                        <circle cx="-9" cy="-122" r="7" fill="#fff" stroke="#000" stroke-width="1.5"/>
                        <circle cx="-8" cy="-124" r="3" fill="#000"/>
                        <circle cx="9" cy="-122" r="7" fill="#fff" stroke="#000" stroke-width="1.5"/>
                        <circle cx="7" cy="-121" r="3" fill="#000"/>
                    </g>
                    <!-- Center Egg Hub -->
                    <circle cx="0" cy="0" r="34" fill="#ef4444" stroke="#fff" stroke-width="4"/>
                    <text x="0" y="8" font-size="22" text-anchor="middle">🍳</text>
                </svg>
            `
        },

        saw: {
            name: "Sierra del Apocalipsis",
            icon: "⚙️",
            desc: "Dientes de titanio oxidado que cortan el aire a pedazos y sueltan chispas.",
            render: () => `
                <svg viewBox="-180 -180 360 360" class="spinner-svg">
                    <defs>
                        <radialGradient id="metalGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stop-color="#94a3b8"/>
                            <stop offset="50%" stop-color="#475569"/>
                            <stop offset="100%" stop-color="#1e293b"/>
                        </radialGradient>
                    </defs>
                    <!-- 16 Saw Teeth -->
                    <path d="
                        M 0 -130 L 25 -100 L 50 -120 L 65 -85 L 95 -95 L 95 -60 L 125 -60 L 115 -25 L 135 -15 L 115 15 L 130 35 L 105 50 L 110 75 L 80 80 L 75 110 L 45 100 L 30 125 L 0 105 L -25 125 L -45 95 L -75 110 L -80 80 L -110 75 L -100 45 L -130 35 L -115 15 L -135 -15 L -110 -25 L -120 -60 L -95 -60 L -95 -95 L -65 -85 L -50 -120 L -25 -100 Z
                    " fill="url(#metalGrad)" stroke="#f59e0b" stroke-width="4"/>
                    <!-- Industrial hazard stripes -->
                    <circle cx="0" cy="0" r="65" fill="#facc15" stroke="#000" stroke-width="6" stroke-dasharray="14 14"/>
                    <circle cx="0" cy="0" r="38" fill="#1e293b" stroke="#e2e8f0" stroke-width="4"/>
                    <text x="0" y="8" font-size="22" text-anchor="middle">⚠️</text>
                </svg>
            `
        },

        fan: {
            name: "Ventilador de Abuela",
            icon: "🌪️",
            desc: "5 aspas de plástico amarillento con balanceo peligroso a más de 1.000 RPM.",
            render: () => `
                <svg viewBox="-180 -180 360 360" class="spinner-svg">
                    <defs>
                        <linearGradient id="fanBlade" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#38bdf8"/>
                            <stop offset="100%" stop-color="#0284c7"/>
                        </linearGradient>
                    </defs>
                    <!-- 5 aerodynamic blades -->
                    ${[0, 72, 144, 216, 288].map(ang => `
                        <g transform="rotate(${ang})">
                            <path d="M0 0 C 20 -40 55 -80 45 -125 C 20 -135 -15 -115 -25 -70 C -15 -40 0 -20 0 0 Z" 
                                  fill="url(#fanBlade)" stroke="#ffffff" stroke-width="3" opacity="0.9"/>
                        </g>
                    `).join('')}
                    <!-- Center Motor Cap -->
                    <circle cx="0" cy="0" r="35" fill="#0f172a" stroke="#38bdf8" stroke-width="5"/>
                    <circle cx="0" cy="0" r="22" fill="#38bdf8"/>
                    <circle cx="0" cy="0" r="10" fill="#ffffff"/>
                </svg>
            `
        },

        gold: {
            name: "Fidget de los Dioses",
            icon: "👑",
            desc: "Oro de 24 kilates, diamantes flotantes y olor a criptomonedas.",
            render: () => `
                <svg viewBox="-180 -180 360 360" class="spinner-svg">
                    <defs>
                        <radialGradient id="goldGrad" cx="40%" cy="40%" r="60%">
                            <stop offset="0%" stop-color="#fef08a"/>
                            <stop offset="40%" stop-color="#eab308"/>
                            <stop offset="80%" stop-color="#ca8a04"/>
                            <stop offset="100%" stop-color="#713f12"/>
                        </radialGradient>
                        <filter id="goldGlow">
                            <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#facc15" flood-opacity="0.9"/>
                        </filter>
                    </defs>
                    <g filter="url(#goldGlow)">
                        <!-- Outer golden frame -->
                        <path d="M 0 -130 C 45 -130 55 -60 70 -35 C 112 -60 148 -10 112 50 C 85 80 50 65 30 75 C -20 140 -90 120 -110 60 C -130 10 -90 -40 -60 -40 C -50 -70 -35 -130 0 -130 Z" 
                              fill="url(#goldGrad)" stroke="#fef08a" stroke-width="4"/>
                    </g>
                    <!-- 3 Giant Diamonds -->
                    <g transform="translate(0, -90) scale(0.8)">
                        <polygon points="0,-22 22,-8 14,20 -14,20 -22,-8" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/>
                        <polygon points="0,-22 14,20 0,10 -14,20" fill="#bae6fd" opacity="0.7"/>
                    </g>
                    <g transform="rotate(120) translate(0, -90) scale(0.8)">
                        <polygon points="0,-22 22,-8 14,20 -14,20 -22,-8" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/>
                        <polygon points="0,-22 14,20 0,10 -14,20" fill="#bae6fd" opacity="0.7"/>
                    </g>
                    <g transform="rotate(240) translate(0, -90) scale(0.8)">
                        <polygon points="0,-22 22,-8 14,20 -14,20 -22,-8" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/>
                        <polygon points="0,-22 14,20 0,10 -14,20" fill="#bae6fd" opacity="0.7"/>
                    </g>
                    <!-- Giant Ruby Core -->
                    <circle cx="0" cy="0" r="36" fill="#e11d48" stroke="#fef08a" stroke-width="4"/>
                    <circle cx="0" cy="0" r="24" fill="#9f1239"/>
                    <circle cx="-6" cy="-6" r="6" fill="#fff" opacity="0.8"/>
                </svg>
            `
        }
    };

    // Initialize Skins UI
    function initSkinSelector() {
        skinSelectContainer.innerHTML = '';
        Object.keys(SKINS).forEach(skinKey => {
            const skin = SKINS[skinKey];
            const btn = document.createElement('button');
            btn.className = `skin-btn ${skinKey === currentSkin ? 'active' : ''}`;
            btn.dataset.skin = skinKey;
            btn.innerHTML = `
                <span class="skin-icon">${skin.icon}</span>
                <span class="skin-name">${skin.name}</span>
            `;
            btn.addEventListener('click', () => {
                setSkin(skinKey);
                audio.playClick(1.2);
            });
            skinSelectContainer.appendChild(btn);
        });
    }

    function setSkin(skinKey) {
        if (!SKINS[skinKey]) return;
        currentSkin = skinKey;
        document.querySelectorAll('.skin-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.skin === skinKey);
        });
        spinnerElement.innerHTML = SKINS[skinKey].render();
        showMemeNotice(`Skin equipada: ${SKINS[skinKey].name}`);
    }

    // Notice Toast
    let memeNoticeTimeout;
    function showMemeNotice(text) {
        if (!memeBanner) return;
        memeBanner.textContent = text;
        memeBanner.classList.add('visible');
        clearTimeout(memeNoticeTimeout);
        memeNoticeTimeout = setTimeout(() => {
            memeBanner.classList.remove('visible');
        }, 2200);
    }

    // Pointer Events for Drag & Flick
    function onPointerDown(e) {
        audio.resume();
        const clientX = e.clientX ?? e.touches?.[0]?.clientX;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY;
        if (clientX === undefined) return;

        // Check if clicking center bearing for honk/squawk
        const dist = physics.getDistanceFromCenter(clientX, clientY);
        if (dist < 40) {
            if (currentSkin === 'chicken') {
                audio.playHonk();
            } else {
                audio.playClick(1.5);
            }
            createSparks(clientX, clientY, 8, '#ffffff');
            showMemeNotice(currentSkin === 'chicken' ? "¡¡¡KIKIRIKÍÍÍ!!!" : "¡Clic en el rodamiento!");
            return;
        }

        physics.onPointerDown(clientX, clientY);
        audio.playClick(1.0);
    }

    function onPointerMove(e) {
        if (!physics.isDragging) return;
        const clientX = e.clientX ?? e.touches?.[0]?.clientX;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY;
        if (clientX === undefined) return;

        physics.onPointerMove(clientX, clientY);

        // Periodic clicks while dragging
        if (Math.random() < 0.18) {
            audio.playClick(0.9 + Math.random() * 0.3);
        }
    }

    function onPointerUp() {
        if (!physics.isDragging) return;
        const releasedRPM = physics.onPointerUp();
        if (releasedRPM > 200) {
            const intensity = Math.min(2.5, releasedRPM / 1200);
            audio.playFlick(intensity);
            if (releasedRPM > 3000) {
                showMemeNotice(`🔥 ¡FLICK BESTIAL! ${Math.round(releasedRPM)} RPM`);
            }
        }
    }

    // Attach listeners
    spinnerContainer.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    spinnerContainer.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', (e) => {
        if (physics.isDragging) e.preventDefault();
        onPointerMove(e);
    }, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    // --- BUTTON CONTROLS & UPGRADES ---
    // Mute
    muteBtn.addEventListener('click', () => {
        audio.resume();
        const isMuted = audio.toggleMute();
        muteBtn.textContent = isMuted ? '🔇 Silenciado' : '🔊 Sonido ON';
        muteBtn.classList.toggle('active', !isMuted);
    });

    // Soplido Cósmico (+1000 RPM)
    blowBtn.addEventListener('click', () => {
        audio.resume();
        audio.playFlick(1.8);
        const impulseDir = (physics.velocity >= 0) ? 1 : -1;
        physics.applyImpulse(impulseDir * 95); // ~900 RPM impulse
        createWindBurst();
        showMemeNotice('💨 ¡SOPLIDO DE PULMONES DE ACERO! +900 RPM');
    });

    // WD-40 (Casi Cero Fricción)
    wd40Btn.addEventListener('click', () => {
        audio.resume();
        audio.playSpray();
        const newState = !physics.wd40Active;
        physics.setWD40(newState);
        wd40Btn.classList.toggle('active', newState);
        wd40Btn.innerHTML = newState ? '🧴 WD-40: <span class="badge">ACTIVO</span>' : '🧴 Echar WD-40';
        showMemeNotice(newState ? '🧴 ¡Rodamiento lubricado con WD-40! Fricción reducida un 95%' : 'WD-40 evaporado.');
        createSparks(physics.center.x, physics.center.y, 25, '#38bdf8');
    });

    // Turbo V8
    turboBtn.addEventListener('click', () => {
        audio.resume();
        isTurboActive = !isTurboActive;
        physics.turboActive = isTurboActive;
        turboBtn.classList.toggle('active', isTurboActive);
        turboBtn.innerHTML = isTurboActive ? '🚀 Turbo V8: <span class="badge">FUEGO</span>' : '🚀 Activar Turbo V8';

        if (isTurboActive) {
            audio.playRocket();
            showMemeNotice('🚀 ¡MOTOR V8 RUGIENDO! ¡ACELERANDO SIN FRENOS!');
        }
    });

    // Frenar de Golpe
    brakeBtn.addEventListener('mousedown', () => {
        isBraking = true;
        audio.playClick(0.7);
    });
    window.addEventListener('mouseup', () => {
        isBraking = false;
    });
    brakeBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isBraking = true;
    });
    window.addEventListener('touchend', () => {
        isBraking = false;
    });

    // Modo Rave / Fiesta
    raveBtn.addEventListener('click', () => {
        isRaveActive = !isRaveActive;
        document.body.classList.toggle('rave-mode', isRaveActive);
        raveBtn.classList.toggle('active', isRaveActive);
        raveBtn.innerHTML = isRaveActive ? '🌈 Modo Rave: <span class="badge">ON</span>' : '🌈 Modo Rave';
        if (isRaveActive) {
            showMemeNotice('🚨 ¡ADVERTENCIA DE EPILEPSIA SHITPOST ACTIVADA!');
        }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            blowBtn.click();
        } else if (e.code === 'KeyW') {
            wd40Btn.click();
        } else if (e.code === 'KeyT') {
            turboBtn.click();
        } else if (e.code === 'KeyB') {
            isBraking = true;
        } else if (e.code === 'KeyM') {
            muteBtn.click();
        } else if (e.code === 'KeyR') {
            raveBtn.click();
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyB') {
            isBraking = false;
        }
    });

    // --- PARTICLE SYSTEMS ---
    function createSparks(x, y, count = 5, color = '#f59e0b') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 8;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                size: 2 + Math.random() * 3.5,
                color
            });
        }
    }

    function createWindBurst() {
        const cx = physics.center.x;
        const cy = physics.center.y;
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 120;
            particles.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                vx: Math.cos(angle + Math.PI / 2) * (5 + Math.random() * 10),
                vy: Math.sin(angle + Math.PI / 2) * (5 + Math.random() * 10),
                life: 1.0,
                decay: 0.04,
                size: 3,
                color: '#38bdf8'
            });
        }
    }

    function triggerShockwave(rpm) {
        audio.playSonicBoom();
        shockwaves.push({
            x: physics.center.x,
            y: physics.center.y,
            radius: 40,
            maxRadius: Math.max(window.innerWidth, window.innerHeight) * 0.8,
            life: 1.0,
            color: rpm > 10000 ? '#ec4899' : '#38bdf8'
        });
        showMemeNotice(`💥 ¡BARRERA DEL SONIDO ROTA! (${rpm} RPM)`);
    }

    // --- MAIN GAME LOOP ---
    let lastTimestamp = performance.now();

    function gameLoop(timestamp) {
        const dt = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;

        // Apply braking if held
        if (isBraking) {
            physics.brake(0.88);
            if (physics.currentRPM > 100) {
                createSparks(physics.center.x, physics.center.y, 4, '#ef4444');
            }
        }

        // Physics step
        const state = physics.update(dt);
        const rpm = state.rpm;

        // Update audio
        audio.updateRPM(rpm);

        // Sonic Boom thresholds
        if (rpm >= 5000 && !brokenMach1) {
            brokenMach1 = true;
            triggerShockwave(rpm);
        } else if (rpm < 4000) {
            brokenMach1 = false;
        }

        if (rpm >= 10000 && !brokenMach2) {
            brokenMach2 = true;
            triggerShockwave(rpm);
        } else if (rpm < 9000) {
            brokenMach2 = false;
        }

        // Apply Rotation to DOM
        spinnerElement.style.transform = `rotate(${state.angleDeg}deg)`;

        // Motion blur simulation
        if (rpm > 1200) {
            const blurAmount = Math.min(8, (rpm - 1200) / 1000);
            spinnerElement.style.filter = `blur(${blurAmount}px)`;
        } else {
            spinnerElement.style.filter = 'none';
        }

        // Screen Shake at extreme speeds
        if (rpm > 2200) {
            const shakeFactor = Math.min(18, (rpm - 2200) / 450);
            const shakeX = (Math.random() * 2 - 1) * shakeFactor;
            const shakeY = (Math.random() * 2 - 1) * shakeFactor;
            spinnerContainer.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
        } else {
            spinnerContainer.style.transform = 'translate(0px, 0px)';
        }

        // High RPM Sparks emission
        if (rpm > 2500) {
            const sparkCount = Math.min(6, Math.floor(rpm / 2000));
            const color = rpm > 6000 ? '#ec4899' : (rpm > 4000 ? '#ef4444' : '#f59e0b');
            createSparks(physics.center.x, physics.center.y, sparkCount, color);
        }

        // Update UI
        rpmValueEl.textContent = rpm.toLocaleString();
        maxRpmEl.textContent = state.maxRPM.toLocaleString();
        totalSpinsEl.textContent = state.totalSpins.toLocaleString();

        // RPM Gauge fill (scale up to 12,000 RPM)
        const gaugePct = Math.min(100, (rpm / 10000) * 100);
        rpmGaugeFill.style.width = `${gaugePct}%`;

        // Speed status humor text
        if (rpm === 0) {
            speedStatusEl.textContent = "💤 Estado: Parado. ¡Gírame con ganas!";
            speedStatusEl.style.color = "#94a3b8";
        } else if (rpm < 800) {
            speedStatusEl.textContent = "🐢 Estado: Giro de abuelita";
            speedStatusEl.style.color = "#38bdf8";
        } else if (rpm < 2000) {
            speedStatusEl.textContent = "⚡ Estado: Velocidad respetable";
            speedStatusEl.style.color = "#4ade80";
        } else if (rpm < 4500) {
            speedStatusEl.textContent = "🔥 Estado: Rodamiento al rojo vivo";
            speedStatusEl.style.color = "#facc15";
        } else if (rpm < 8000) {
            speedStatusEl.textContent = "🚀 Estado: MACH 1 - ROMPIENDO LA BARRERA DEL SONIDO";
            speedStatusEl.style.color = "#f97316";
        } else {
            speedStatusEl.textContent = "☠️ ESTADO: PELIGRO DE DESINTEGRACIÓN CUÁNTICA";
            speedStatusEl.style.color = "#ef4444";
        }

        // Render Particles & Shockwaves
        ctxParticles.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

        // Draw Shockwaves
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            sw.radius += 18;
            sw.life -= 0.02;
            if (sw.life <= 0 || sw.radius >= sw.maxRadius) {
                shockwaves.splice(i, 1);
                continue;
            }
            ctxParticles.beginPath();
            ctxParticles.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctxParticles.strokeStyle = sw.color;
            ctxParticles.lineWidth = 6 * sw.life;
            ctxParticles.globalAlpha = sw.life * 0.8;
            ctxParticles.stroke();
        }

        // Draw Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctxParticles.beginPath();
            ctxParticles.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctxParticles.fillStyle = p.color;
            ctxParticles.globalAlpha = p.life;
            ctxParticles.fill();
        }
        ctxParticles.globalAlpha = 1.0;

        requestAnimationFrame(gameLoop);
    }

    // Init components
    resizeCanvas();
    initSkinSelector();
    setSkin('classic');
    requestAnimationFrame(gameLoop);
});
