// audio.js - Web Audio API Procedural Sound Engine for Fidget Spinner Pro Max 3000

class SpinnerAudio {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.masterGain = null;
        
        // Continuous Hum nodes
        this.humOsc1 = null;
        this.humOsc2 = null;
        this.humFilter = null;
        this.humGain = null;
        this.noiseNode = null;
        this.noiseGain = null;

        this.initialized = false;
        this.lastClickAngle = 0;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.ctx = new AudioContext();

            // Master Gain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            // 1. Continuous Hum Synth (Bearing Resonance)
            this.humOsc1 = this.ctx.createOscillator();
            this.humOsc1.type = 'triangle';
            this.humOsc1.frequency.setValueAtTime(0, this.ctx.currentTime);

            this.humOsc2 = this.ctx.createOscillator();
            this.humOsc2.type = 'sawtooth';
            this.humOsc2.frequency.setValueAtTime(0, this.ctx.currentTime);

            this.humFilter = this.ctx.createBiquadFilter();
            this.humFilter.type = 'lowpass';
            this.humFilter.frequency.setValueAtTime(150, this.ctx.currentTime);
            this.humFilter.Q.setValueAtTime(4, this.ctx.currentTime);

            this.humGain = this.ctx.createGain();
            this.humGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

            this.humOsc1.connect(this.humFilter);
            this.humOsc2.connect(this.humFilter);
            this.humFilter.connect(this.humGain);
            this.humGain.connect(this.masterGain);

            this.humOsc1.start();
            this.humOsc2.start();

            // 2. Air Rush Noise (White Noise filtered)
            const bufferSize = this.ctx.sampleRate * 2;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * 0.5;
            }

            this.noiseNode = this.ctx.createBufferSource();
            this.noiseNode.buffer = noiseBuffer;
            this.noiseNode.loop = true;

            this.noiseFilter = this.ctx.createBiquadFilter();
            this.noiseFilter.type = 'bandpass';
            this.noiseFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
            this.noiseFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

            this.noiseGain = this.ctx.createGain();
            this.noiseGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

            this.noiseNode.connect(this.noiseFilter);
            this.noiseFilter.connect(this.noiseGain);
            this.noiseGain.connect(this.masterGain);

            this.noiseNode.start();

            this.initialized = true;
        } catch (e) {
            console.warn("Audio Context init blocked or failed:", e);
        }
    }

    resume() {
        if (!this.initialized) {
            this.init();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime, 0.05);
        }
        return this.isMuted;
    }

    // Update continuous sound based on current RPM
    updateRPM(rpm) {
        if (!this.initialized || !this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const absRpm = Math.abs(rpm);

        if (absRpm < 5) {
            this.humGain.gain.setTargetAtTime(0.0001, now, 0.05);
            this.noiseGain.gain.setTargetAtTime(0.0001, now, 0.05);
            return;
        }

        // Pitch scale: from 40Hz up to 2800Hz
        const baseFreq = 40 + Math.pow(absRpm / 1500, 0.9) * 220;
        const clampedFreq = Math.min(3200, Math.max(30, baseFreq));

        this.humOsc1.frequency.setTargetAtTime(clampedFreq, now, 0.04);
        this.humOsc2.frequency.setTargetAtTime(clampedFreq * 1.5, now, 0.04);

        // Filter opening
        const filterFreq = Math.min(4500, 180 + absRpm * 0.4);
        this.humFilter.frequency.setTargetAtTime(filterFreq, now, 0.04);

        // Gain curve
        const humVol = Math.min(0.6, (absRpm / 2000) * 0.45);
        this.humGain.gain.setTargetAtTime(humVol, now, 0.05);

        // Wind noise
        const windFreq = Math.min(3000, 300 + absRpm * 0.25);
        this.noiseFilter.frequency.setTargetAtTime(windFreq, now, 0.05);
        const windVol = Math.min(0.4, (absRpm / 3500) * 0.35);
        this.noiseGain.gain.setTargetAtTime(windVol, now, 0.05);
    }

    // Play quick whoosh sound on drag/flick
    playFlick(intensity = 1.0) {
        if (!this.initialized || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(120 + intensity * 80, now);
        osc.frequency.exponentialRampToValueAtTime(380 + intensity * 150, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

        gain.gain.setValueAtTime(0.25 * Math.min(1.5, intensity), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.23);
    }

    // Play bearing click sound
    playClick(pitch = 1.0) {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.03);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.04);
    }

    // Meme Squeak / Boing for gag buttons or center bearing
    playHonk() {
        if (!this.initialized || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(850, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.25);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    // Sonic boom / Mach break sound
    playSonicBoom() {
        if (!this.initialized || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.7);

        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.85);
    }

    // Rocket booster sound
    playRocket() {
        if (!this.initialized || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.linearRampToValueAtTime(650, now + 0.4);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.52);
    }

    // WD-40 spray sound
    playSpray() {
        if (!this.initialized || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        const bufferSize = this.ctx.sampleRate * 0.35;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.6;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2000, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.36);
    }
}

window.spinnerAudio = new SpinnerAudio();
