// Morse encoding/decoding module
const MorseEncoder = (() => {
    const MORSE_MAP = {
        'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
        'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
        'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
        'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
        'Y': '-.--', 'Z': '--..',
        '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
        '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
        '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', '/': '-..-.',
        '@': '.--.-.', '-': '-....-', ':': '---...'
    };

    const REVERSE_MAP = Object.fromEntries(
        Object.entries(MORSE_MAP).map(([k, v]) => [v, k])
    );

    return {
        toMorse: function(text) {
            if (!text) return '';
            const words = text.toUpperCase().split(/\s+/).filter(Boolean);
            return words.map(w => {
                const letters = [];
                for (const ch of w) {
                    if (MORSE_MAP[ch]) letters.push(MORSE_MAP[ch]);
                }
                return letters.join(' ');
            }).join(' / ');
        },

        toEnglish: function(morse) {
            if (!morse) return '';
            return morse.split(' / ').map(word => {
                return word.split(' ').filter(Boolean).map(code => REVERSE_MAP[code] || '').join('');
            }).join(' ');
        }
    };
})();
