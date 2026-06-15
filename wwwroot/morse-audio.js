// Morse audio playback module
const MorseAudio = (() => {
    const MORSE_SPEED = 100; // milliseconds per unit (dot)
    let audioContext = null;

    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContext;
    }

    function playBeep(ctx, startTime, duration, frequency) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    return {
        play: function(morseCode) {
            const ctx = initAudioContext();
            const frequency = 800; // Hz - standard Morse frequency
            const dotDuration = MORSE_SPEED; // 1 unit
            const dashDuration = MORSE_SPEED * 3; // 3 units
            const symbolGapDuration = MORSE_SPEED; // 1 unit between . and -
            const letterGapDuration = MORSE_SPEED * 3; // 3 units between letters
            const wordGapDuration = MORSE_SPEED * 7; // 7 units between words

            let currentTime = ctx.currentTime;

            for (let i = 0; i < morseCode.length; i++) {
                const char = morseCode[i];

                if (char === '.') {
                    playBeep(ctx, currentTime, dotDuration / 1000, frequency);
                    currentTime += dotDuration / 1000;
                } else if (char === '-') {
                    playBeep(ctx, currentTime, dashDuration / 1000, frequency);
                    currentTime += dashDuration / 1000;
                } else if (char === ' ') {
                    // Space between symbols within a letter
                    currentTime += symbolGapDuration / 1000;
                } else if (char === '/') {
                    // Word separator
                    currentTime += wordGapDuration / 1000;
                }

                // Add gap after each symbol (except at the end or before /)
                if ((char === '.' || char === '-') && i < morseCode.length - 1 && morseCode[i + 1] !== ' ') {
                    currentTime += symbolGapDuration / 1000;
                }
            }
        }
    };
})();
