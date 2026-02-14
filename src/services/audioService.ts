export interface AudioService {
    playCorrect(): void;
    playIncorrect(): void;
    playWin(): void;
}

class WebAudioService implements AudioService {
    private playTone(frequency: number, type: OscillatorType, duration: number) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
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
        //    playCorrect() {
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

    playPop() {
        this.playTone(800, 'sine', 0.05);
    }
    playCashRegister() {
        // Cha-ching!
        this.playTone(1000, 'square', 0.1);
        setTimeout(() => this.playTone(2000, 'sine', 0.2), 100);
    }

    playExpansion() {
        // Boom + Fanfare
        this.playTone(100, 'sawtooth', 0.5);
        setTimeout(() => this.playWin(), 300);
    }

    playAnimalSound(type: 'dog' | 'cat' | 'cow' | 'chick' | string) {
        // Very basic synth approximations or standard pops
        switch (type) {
            case 'dog': // Woof - low square
                this.playTone(150, 'square', 0.1);
                setTimeout(() => this.playTone(100, 'square', 0.1), 150);
                break;
            case 'chick': // Peep - high sine
                this.playTone(1200, 'sine', 0.05);
                setTimeout(() => this.playTone(1500, 'sine', 0.05), 100);
                break;
            case 'cow': // Moo - long low saw
                this.playTone(100, 'sawtooth', 0.8);
                break;
            default:
                this.playPop();
        }
    }
}

export const audioService = new WebAudioService();
