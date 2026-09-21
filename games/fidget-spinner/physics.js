// physics.js - Rotational Physics & Interaction Engine for Fidget Spinner

class SpinnerPhysics {
    constructor() {
        this.angle = 0;              // Current angle in radians
        this.velocity = 0;           // Angular velocity in radians per second
        this.baseFriction = 0.65;    // Friction decay rate per second (standard)
        this.friction = 0.65;
        this.wd40Active = false;
        this.turboActive = false;

        // Interaction tracking
        this.isDragging = false;
        this.lastAngle = 0;
        this.lastTime = 0;
        this.velocityHistory = [];   // Rolling buffer for smooth flick release
        this.center = { x: 0, y: 0 };
        this.radius = 180;

        // Statistics
        this.totalRevolutions = parseFloat(localStorage.getItem('fidget_total_spins') || '0');
        this.maxRPM = parseFloat(localStorage.getItem('fidget_max_rpm') || '0');
        this.currentRPM = 0;
        this.soundBarrierBroken = false;
    }

    setCenter(x, y, radius = 180) {
        this.center = { x, y };
        this.radius = radius;
    }

    getAngleFromPoint(x, y) {
        const dx = x - this.center.x;
        const dy = y - this.center.y;
        return Math.atan2(dy, dx);
    }

    getDistanceFromCenter(x, y) {
        const dx = x - this.center.x;
        const dy = y - this.center.y;
        return Math.hypot(dx, dy);
    }

    onPointerDown(x, y) {
        this.isDragging = true;
        this.lastAngle = this.getAngleFromPoint(x, y);
        this.lastTime = performance.now();
        this.velocityHistory = [];
        this.velocity = 0; // stop immediate free spin to hold spinner
    }

    onPointerMove(x, y) {
        if (!this.isDragging) return;

        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        if (dt <= 0.001) return;

        const currentAngle = this.getAngleFromPoint(x, y);
        let deltaAngle = currentAngle - this.lastAngle;

        // Normalize delta to handle [-PI, PI] wrap-around
        while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
        while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

        this.angle += deltaAngle;
        
        // Track stats during drag
        const revDelta = Math.abs(deltaAngle) / (Math.PI * 2);
        this.totalRevolutions += revDelta;

        const instVel = deltaAngle / dt;
        this.velocityHistory.push({ vel: instVel, time: now });

        // Keep only last 100ms
        const cutoff = now - 100;
        this.velocityHistory = this.velocityHistory.filter(item => item.time >= cutoff);

        this.lastAngle = currentAngle;
        this.lastTime = now;
    }

    onPointerUp() {
        if (!this.isDragging) return 0;
        this.isDragging = false;

        // Calculate average velocity from recent drag history
        if (this.velocityHistory.length > 0) {
            let total = 0;
            let count = 0;
            for (let i = 0; i < this.velocityHistory.length; i++) {
                total += this.velocityHistory[i].vel;
                count++;
            }
            this.velocity = total / count;

            // Cap extreme flick speeds to prevent numeric blowup
            const maxRadSec = 2200; // ~21,000 RPM max flick
            this.velocity = Math.max(-maxRadSec, Math.min(maxRadSec, this.velocity));
        } else {
            this.velocity = 0;
        }

        const releasedRPM = Math.abs(this.velocity / (Math.PI * 2)) * 60;
        return releasedRPM;
    }

    applyImpulse(radSec) {
        this.velocity += radSec;
        const maxRadSec = 3500; // ~33,000 RPM
        this.velocity = Math.max(-maxRadSec, Math.min(maxRadSec, this.velocity));
    }

    setWD40(active) {
        this.wd40Active = active;
        this.friction = active ? 0.045 : this.baseFriction; // Much longer spin with WD-40
    }

    brake(factor = 0.82) {
        this.velocity *= factor;
        if (Math.abs(this.velocity) < 0.1) this.velocity = 0;
    }

    update(dt) {
        // Clamp dt to avoid huge jumps on tab switch
        const clampedDt = Math.min(dt, 0.1);

        if (this.turboActive) {
            const turboTorque = 180; // Continuously add torque in direction of spin
            const dir = this.velocity >= 0 ? 1 : -1;
            this.velocity += dir * turboTorque * clampedDt;
        }

        if (!this.isDragging) {
            // Rotational update
            this.angle += this.velocity * clampedDt;

            // Apply friction
            // Exponential decay: v(t) = v0 * e^(-k * t)
            const decay = Math.exp(-this.friction * clampedDt);
            this.velocity *= decay;

            // Air drag at high velocities (quadratic drag term)
            const dragTerm = 0.00008 * Math.abs(this.velocity) * clampedDt;
            this.velocity *= Math.max(0, 1 - dragTerm);

            if (Math.abs(this.velocity) < 0.05) {
                this.velocity = 0;
            }

            // Track stats
            const revDelta = (Math.abs(this.velocity) * clampedDt) / (Math.PI * 2);
            this.totalRevolutions += revDelta;
        }

        // Keep angle bounded in [0, 2PI) for neatness, though continuous rotation works
        while (this.angle < 0) this.angle += Math.PI * 2;
        while (this.angle >= Math.PI * 2) this.angle -= Math.PI * 2;

        // Current RPM
        this.currentRPM = Math.round(Math.abs(this.velocity / (Math.PI * 2)) * 60);

        // Update Max RPM
        if (this.currentRPM > this.maxRPM) {
            this.maxRPM = this.currentRPM;
            localStorage.setItem('fidget_max_rpm', this.maxRPM.toString());
        }

        // Save total revolutions periodically
        if (Math.random() < 0.02) {
            localStorage.setItem('fidget_total_spins', Math.floor(this.totalRevolutions).toString());
        }

        return {
            angleDeg: (this.angle * 180) / Math.PI,
            rpm: this.currentRPM,
            maxRPM: this.maxRPM,
            totalSpins: Math.floor(this.totalRevolutions),
            velocity: this.velocity
        };
    }
}

window.spinnerPhysics = new SpinnerPhysics();
