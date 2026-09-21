// gba_ui.js - Complete UI Controller for GBA Emulator & Pokemon Esmeralda

let Iodine = null;
let Blitter = null;
let Mixer = null;
let MixerInput = null;
let currentRomName = "pokemon_esmeralda";
let isPaused = false;
let isTurbo = false;
let isMuted = false;
let fpsCounter = 0;
let lastFpsTime = performance.now();

// Button mapping constants in Iodine
const GBA_BUTTONS = {
    A: 0,
    B: 1,
    SELECT: 2,
    START: 3,
    RIGHT: 4,
    LEFT: 5,
    UP: 6,
    DOWN: 7,
    R: 8,
    L: 9
};

// Keyboard mappings
const KEY_MAP = {
    // A Button (X, J)
    'KeyX': GBA_BUTTONS.A,
    'KeyJ': GBA_BUTTONS.A,
    // B Button (Z, K)
    'KeyZ': GBA_BUTTONS.B,
    'KeyK': GBA_BUTTONS.B,
    // Start (Enter)
    'Enter': GBA_BUTTONS.START,
    // Select (Shift)
    'ShiftLeft': GBA_BUTTONS.SELECT,
    'ShiftRight': GBA_BUTTONS.SELECT,
    'Backspace': GBA_BUTTONS.SELECT,
    // D-Pad Arrows & WASD
    'ArrowUp': GBA_BUTTONS.UP,
    'KeyW': GBA_BUTTONS.UP,
    'ArrowDown': GBA_BUTTONS.DOWN,
    'KeyS': GBA_BUTTONS.DOWN,
    'ArrowLeft': GBA_BUTTONS.LEFT,
    'KeyA': GBA_BUTTONS.LEFT,
    'ArrowRight': GBA_BUTTONS.RIGHT,
    'KeyD': GBA_BUTTONS.RIGHT,
    // Shoulder Buttons
    'KeyQ': GBA_BUTTONS.L,
    'Digit1': GBA_BUTTONS.L,
    'KeyE': GBA_BUTTONS.R,
    'Digit2': GBA_BUTTONS.R
};

// Active pressed buttons tracking to prevent stuck inputs
const activeKeys = new Set();

function initEmulator() {
    console.log("Initializing Iodine GBA Emulator...");
    try {
        Iodine = new GameBoyAdvanceEmulator();

        // Canvas / Graphics
        Blitter = new GlueCodeGfx();
        const canvas = document.getElementById("emulator_target");
        Blitter.attachCanvas(canvas);
        Blitter.setSmoothScaling(false);
        Iodine.attachGraphicsFrameHandler(function (buffer) {
            Blitter.copyBuffer(buffer);
            countFPS();
        });

        // Audio
        Mixer = new GlueCodeMixer();
        MixerInput = new GlueCodeMixerInput(Mixer);
        Iodine.attachAudioHandler(MixerInput);
        Iodine.enableAudio();

        // Save Handlers
        Iodine.attachSaveExportHandler(saveExportHandler);
        Iodine.attachSaveImportHandler(saveImportHandler);

        // Speed Handler
        Iodine.attachSpeedHandler(function (speed) {
            const speedBadge = document.getElementById("speed-indicator");
            if (speedBadge) {
                speedBadge.textContent = speed;
            }
        });

        // Load Default Game: Pokemon Esmeralda
        loadROMFiles("roms/gba_bios.bin", "roms/pokemon_esmeralda.gba");
    } catch (e) {
        console.error("Emulator init failed:", e);
        showStatus("Error al inicializar el emulador: " + e.message, true);
    }
}

// FPS Counter
function countFPS() {
    fpsCounter++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
        const fpsEl = document.getElementById("fps-indicator");
        if (fpsEl) {
            fpsEl.textContent = `${fpsCounter} FPS`;
        }
        fpsCounter = 0;
        lastFpsTime = now;
    }
}

// AudioContext Unlock for modern browsers
function unlockAudio() {
    if (window.XAudioJSWebAudioContextHandle && window.XAudioJSWebAudioContextHandle.state === 'suspended') {
        window.XAudioJSWebAudioContextHandle.resume().then(() => {
            console.log("AudioContext resumed successfully.");
        }).catch(err => console.warn("Audio resume error:", err));
    }
}
window.addEventListener('click', unlockAudio);
window.addEventListener('keydown', unlockAudio);
window.addEventListener('touchstart', unlockAudio);

// Save Handlers
function saveImportHandler(name) {
    try {
        const key = "SAVE_" + (name || currentRomName);
        const data = localStorage.getItem(key);
        if (data) {
            showStatus("Partida guardada cargada con éxito.");
            return base64ToArray(JSON.parse(data));
        }
    } catch (e) {
        console.warn("Could not load save:", e);
    }
    return null;
}

function saveExportHandler(name, save) {
    if (!name && !currentRomName) return;
    try {
        const key = "SAVE_" + (name || currentRomName);
        const b64 = arrayToBase64(save);
        localStorage.setItem(key, JSON.stringify(b64));
        showStatus("💾 Partida guardada automáticamente.");
    } catch (e) {
        console.warn("Save export failed:", e);
    }
}

// ROM Loading via fetch with progress bar
async function loadROMFiles(biosPath, romPath) {
    const progressBar = document.getElementById("loading-progress");
    const progressContainer = document.getElementById("loading-overlay");
    const statusText = document.getElementById("loading-text");

    try {
        if (progressContainer) progressContainer.style.display = "flex";
        if (statusText) statusText.textContent = "Descargando BIOS de GBA...";
        if (progressBar) progressBar.style.width = "15%";

        // 1. Fetch BIOS
        const biosResp = await fetch(biosPath);
        if (!biosResp.ok) throw new Error("No se pudo cargar la BIOS de GBA");
        const biosBuffer = await biosResp.arrayBuffer();
        Iodine.attachBIOS(new Uint8Array(biosBuffer));

        if (statusText) statusText.textContent = "Cargando Pokémon Edición Esmeralda (16 MB)...";
        if (progressBar) progressBar.width = "40%";

        // 2. Fetch ROM with progress
        const romResp = await fetch(romPath);
        if (!romResp.ok) throw new Error("No se pudo cargar la ROM de Pokémon Esmeralda");
        
        const contentLength = +romResp.headers.get('Content-Length') || 16777216;
        const reader = romResp.body.getReader();
        let receivedBytes = 0;
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedBytes += value.length;
            const pct = Math.min(95, 40 + Math.round((receivedBytes / contentLength) * 55));
            if (progressBar) progressBar.style.width = `${pct}%`;
            if (statusText) statusText.textContent = `Descargando ROM: ${(receivedBytes / (1024 * 1024)).toFixed(1)} MB / ${(contentLength / (1024 * 1024)).toFixed(1)} MB`;
        }

        // Concatenate chunks
        const allChunks = new Uint8Array(receivedBytes);
        let position = 0;
        for (const chunk of chunks) {
            allChunks.set(chunk, position);
            position += chunk.length;
        }

        if (progressBar) progressBar.style.width = "100%";
        if (statusText) statusText.textContent = "¡Iniciando emulador...";

        // Attach ROM
        Iodine.attachROM(allChunks);

        setTimeout(() => {
            if (progressContainer) progressContainer.style.display = "none";
            Iodine.play();
            showStatus("✨ Pokémon Esmeralda iniciado. ¡Pulsa Start o A!");
        }, 300);

    } catch (err) {
        console.error("Error loading ROM:", err);
        if (statusText) statusText.textContent = "Error: " + err.message;
        showStatus("Error al cargar la ROM: " + err.message, true);
    }
}

// Custom ROM Drag & Drop or File Input
function loadCustomROM(file) {
    if (!file) return;
    const reader = new FileReader();
    showStatus(`Cargando archivo: ${file.name}...`);
    reader.onload = function (e) {
        try {
            Iodine.pause();
            currentRomName = file.name.replace(/\.[^/.]+$/, "");
            Iodine.attachROM(new Uint8Array(e.target.result));
            Iodine.play();
            showStatus(`🎮 ${file.name} cargado con éxito!`);
        } catch (err) {
            showStatus("Error al cargar ROM personalizada: " + err.message, true);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Input Handling
function pressButton(buttonIndex) {
    if (!Iodine) return;
    unlockAudio();
    Iodine.keyDown(buttonIndex);
}

function releaseButton(buttonIndex) {
    if (!Iodine) return;
    Iodine.keyUp(buttonIndex);
}

// Setup Keyboard Listeners
window.addEventListener('keydown', (e) => {
    // Turbo shortcut (Space / Tab)
    if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        toggleTurbo();
        return;
    }

    if (KEY_MAP[e.code] !== undefined) {
        e.preventDefault();
        const btn = KEY_MAP[e.code];
        if (!activeKeys.has(e.code)) {
            activeKeys.add(e.code);
            pressButton(btn);
            highlightButton(btn, true);
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (KEY_MAP[e.code] !== undefined) {
        e.preventDefault();
        const btn = KEY_MAP[e.code];
        activeKeys.delete(e.code);
        releaseButton(btn);
        highlightButton(btn, false);
    }
});

function highlightButton(btnIndex, isPressed) {
    const el = document.querySelector(`[data-btn="${btnIndex}"]`);
    if (el) {
        el.classList.toggle('pressed', isPressed);
    }
}

// Attach Virtual Controls (Touch & Mouse)
function setupVirtualControls() {
    const buttons = document.querySelectorAll('[data-btn]');
    buttons.forEach(btn => {
        const btnCode = parseInt(btn.getAttribute('data-btn'), 10);

        const handlePress = (e) => {
            e.preventDefault();
            btn.classList.add('pressed');
            pressButton(btnCode);
        };

        const handleRelease = (e) => {
            e.preventDefault();
            btn.classList.remove('pressed');
            releaseButton(btnCode);
        };

        btn.addEventListener('mousedown', handlePress);
        btn.addEventListener('mouseup', handleRelease);
        btn.addEventListener('mouseleave', handleRelease);

        btn.addEventListener('touchstart', handlePress, { passive: false });
        btn.addEventListener('touchend', handleRelease, { passive: false });
        btn.addEventListener('touchcancel', handleRelease, { passive: false });
    });
}

// Control Bar Features
function togglePause() {
    if (!Iodine) return;
    isPaused = !isPaused;
    const btn = document.getElementById("pause-btn");
    const led = document.getElementById("power-led");

    if (isPaused) {
        Iodine.pause();
        if (btn) btn.innerHTML = "▶️ Reanudar";
        if (led) led.className = "power-led paused";
        showStatus("Emulador en pausa.");
    } else {
        Iodine.play();
        if (btn) btn.innerHTML = "⏸️ Pausar";
        if (led) led.className = isTurbo ? "power-led turbo" : "power-led on";
        showStatus("Emulador reanudado.");
    }
}

function toggleTurbo() {
    if (!Iodine) return;
    isTurbo = !isTurbo;
    const btn = document.getElementById("turbo-btn");
    const led = document.getElementById("power-led");

    if (isTurbo) {
        Iodine.setSpeed(2.8); // 2.8x speed for smooth fast-forwarding
        if (btn) {
            btn.classList.add('active');
            btn.innerHTML = "⚡ Turbo: <b>ON (2.8x)</b>";
        }
        if (led && !isPaused) led.className = "power-led turbo";
        showStatus("⚡ Modo Turbo activado (2.8x) - ¡Grindeo supersónico!");
    } else {
        Iodine.setSpeed(1.0);
        if (btn) {
            btn.classList.remove('active');
            btn.innerHTML = "⚡ Modo Turbo";
        }
        if (led && !isPaused) led.className = "power-led on";
        showStatus("Velocidad normal (1.0x).");
    }
}

function toggleMute() {
    if (!Iodine) return;
    isMuted = !isMuted;
    const btn = document.getElementById("mute-btn");
    if (isMuted) {
        Iodine.disableAudio();
        if (btn) btn.innerHTML = "🔇 Silenciado";
        showStatus("Audio silenciado.");
    } else {
        unlockAudio();
        Iodine.enableAudio();
        if (btn) btn.innerHTML = "🔊 Sonido ON";
        showStatus("Audio activado.");
    }
}

function toggleFullscreen() {
    const stage = document.querySelector(".gba-chassis");
    if (!document.fullscreenElement) {
        stage.requestFullscreen().catch(err => {
            console.warn("Fullscreen request error:", err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Export Save (.sav download)
function exportSaveFile() {
    if (!Iodine) return;
    Iodine.exportSave();
    const key = "SAVE_" + currentRomName;
    const raw = localStorage.getItem(key);
    if (!raw) {
        showStatus("No hay ninguna partida guardada registrada todavía.", true);
        return;
    }

    try {
        const arr = base64ToArray(JSON.parse(raw));
        const uint8 = new Uint8Array(arr);
        const blob = new Blob([uint8], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentRomName}.sav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showStatus(`💾 Archivo ${currentRomName}.sav descargado.`);
    } catch (err) {
        showStatus("Error al exportar partida: " + err.message, true);
    }
}

// Import Save (.sav file upload)
function importSaveFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const buffer = e.target.result;
            const uint8 = new Uint8Array(buffer);
            const numArr = Array.from(uint8);
            const b64 = arrayToBase64(numArr);
            const key = "SAVE_" + currentRomName;
            localStorage.setItem(key, JSON.stringify(b64));
            showStatus(`Partida ${file.name} importada con éxito. Reinicia el juego para cargar.`);
            setTimeout(() => {
                if (confirm("Partida importada. ¿Deseas recargar la ROM para cargar los nuevos datos?")) {
                    location.reload();
                }
            }, 300);
        } catch (err) {
            showStatus("Error al importar partida: " + err.message, true);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Status Banner Notice
let statusTimeout = null;
function showStatus(text, isError = false) {
    const banner = document.getElementById("status-toast");
    if (!banner) return;
    banner.textContent = text;
    banner.className = isError ? "status-toast error visible" : "status-toast visible";
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
        banner.classList.remove("visible");
    }, 2800);
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    setupVirtualControls();

    // Hook buttons
    document.getElementById("pause-btn")?.addEventListener("click", togglePause);
    document.getElementById("turbo-btn")?.addEventListener("click", toggleTurbo);
    document.getElementById("mute-btn")?.addEventListener("click", toggleMute);
    document.getElementById("fullscreen-btn")?.addEventListener("click", toggleFullscreen);
    document.getElementById("export-save-btn")?.addEventListener("click", exportSaveFile);

    // Save File Input
    const saveFileInput = document.getElementById("save-file-input");
    document.getElementById("import-save-btn")?.addEventListener("click", () => saveFileInput?.click());
    saveFileInput?.addEventListener("change", (e) => {
        if (e.target.files?.[0]) importSaveFile(e.target.files[0]);
    });

    // Custom ROM Input
    const romFileInput = document.getElementById("rom-file-input");
    document.getElementById("load-rom-btn")?.addEventListener("click", () => romFileInput?.click());
    romFileInput?.addEventListener("change", (e) => {
        if (e.target.files?.[0]) loadCustomROM(e.target.files[0]);
    });

    // Start Emulator
    initEmulator();
});
