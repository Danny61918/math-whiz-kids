export interface AudioService {
    playCorrect(): void;
    playIncorrect(): void;
    playWin(): void;
}

class WebAudioService implements AudioService {
    private playTone(frequency: number, type: OscillatorType, duration: number) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;

        const ctx = new Ctor();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
    }

    playCorrect() {
        this.playTone(660, 'sine', 0.1);
        setTimeout(() => this.playTone(880, 'sine', 0.2), 100);
    }

    playIncorrect() {
        this.playTone(330, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(220, 'sawtooth', 0.4), 300);
    }

    playWin() {
        // Simple arpeggio
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'square', 0.2), i * 150);
        });
    }
}

export const audioService = new WebAudioService();
