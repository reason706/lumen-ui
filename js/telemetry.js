/**
 * Lumen UI / Car-UI Telemetry & CAN-Bus Simulator Engine
 * Provides an observable state store and 60 FPS realistic vehicle physics simulation.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CarTelemetry = factory();
    if (!root.Lumen) root.Lumen = {};
    root.Lumen.Telemetry = root.CarTelemetry;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class TelemetryEngine {
    constructor() {
      this.state = {
        speed: 84,            // km/h (0 - 260)
        power: 18.5,          // kW (-80 to +350)
        battery: 76,          // % (0 - 100)
        range: 395,           // km
        gear: 'D',            // P, R, N, D
        driveMode: 'sport',   // chill, sport, track
        cabinTemp: 21.5,      // Celsius
        targetTemp: 22.0,     // Celsius
        seatHeatDriver: 2,    // 0, 1, 2, 3
        seatHeatPassenger: 0, // 0, 1, 2, 3
        turnSignal: 'off',    // left, right, hazard, off
        autopilot: 'engaged', // off, standby, engaged, takeover
        tires: {
          fl: 2.8, fr: 2.8,   // Bar
          rl: 2.9, rr: 2.9
        },
        gForce: {
          x: 0.05,            // Lateral G
          y: 0.12             // Longitudinal G
        },
        odometer: 14820       // km
      };

      this.listeners = new Set();
      this.isRunning = false;
      this.animationFrameId = null;
      this.lastTick = 0;
      this.simPhase = 0;
    }

    /**
     * Subscribe to telemetry updates.
     * @param {Function} callback (state) => void
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
      this.listeners.add(callback);
      callback(this.getState());
      return () => this.listeners.delete(callback);
    }

    /**
     * Get snapshot of current state
     */
    getState() {
      return { ...this.state, tires: { ...this.state.tires }, gForce: { ...this.state.gForce } };
    }

    /**
     * Update specific telemetry state keys
     * @param {Object} partialState 
     */
    setState(partialState) {
      this.state = { ...this.state, ...partialState };
      this.notify();
    }

    notify() {
      const snapshot = this.getState();
      this.listeners.forEach(fn => {
        try {
          fn(snapshot);
        } catch (err) {
          console.error('[LumenTelemetry] Listener error:', err);
        }
      });
    }

    /**
     * Start autonomous vehicle telemetry simulation
     */
    startSimulation() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.lastTick = performance.now();

      const loop = (time) => {
        if (!this.isRunning) return;
        const dt = (time - this.lastTick) / 1000;
        this.lastTick = time;
        this.simPhase += dt * 0.8;

        // Realistic driving speed oscillation (65 km/h to 135 km/h)
        const baseSpeed = 95 + Math.sin(this.simPhase) * 28 + Math.sin(this.simPhase * 2.3) * 12;
        const targetSpeed = Math.max(0, Math.min(240, Math.round(baseSpeed)));

        // Power consumption correlates with acceleration
        const accel = (targetSpeed - this.state.speed) / (dt || 0.016);
        let powerKw = accel > 0 ? (accel * 4.2) + (targetSpeed * 0.18) : (accel * 3.8);
        powerKw = Math.max(-65, Math.min(280, Math.round(powerKw * 10) / 10));

        // Lateral & longitudinal G-forces
        const latG = Math.sin(this.simPhase * 1.4) * 0.35;
        const lonG = Math.min(0.65, Math.max(-0.75, accel * 0.035));

        // Battery slow drain
        const batteryDrain = (Math.abs(powerKw) * dt) / 360000;
        const newBattery = Math.max(1, this.state.battery - batteryDrain);

        this.setState({
          speed: targetSpeed,
          power: powerKw,
          battery: Math.round(newBattery * 10) / 10,
          range: Math.round(newBattery * 5.2),
          gForce: {
            x: Math.round(latG * 100) / 100,
            y: Math.round(lonG * 100) / 100
          }
        });

        this.animationFrameId = requestAnimationFrame(loop);
      };

      this.animationFrameId = requestAnimationFrame(loop);
    }

    /**
     * Pause simulation for static component inspection
     */
    stopSimulation() {
      this.isRunning = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
  }

  return new TelemetryEngine();
});

