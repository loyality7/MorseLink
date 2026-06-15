// Morse code detector from microphone input
const MorseDetector = (() => {
    let mediaStream = null;
    let analyser = null;
    let detectionActive = false;
    let detectedMorse = '';
    let onDetectionUpdate = null;
    const THRESHOLD = 30; // Sensitivity threshold for detecting beeps

    // Check if browser supports getUserMedia
    function checkBrowserSupport() {
        // Check if we're on HTTPS or localhost
        const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        
        if (!isSecure) {
            throw new Error('Microphone requires HTTPS. Access via: https://' + location.hostname + ':5051');
        }
        
        const userMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
        if (!userMedia) {
            throw new Error('Microphone API not supported in this browser');
        }
    }

    async function start(callback) {
        try {
            checkBrowserSupport();
            
            onDetectionUpdate = callback;
            
            console.log('Requesting microphone access...');
            
            // Request microphone permission - this will show browser permission dialog
            mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true
            });
            
            console.log('Microphone access granted');
            
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const source = ctx.createMediaStreamAudioSource(mediaStream);
            analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);

            detectionActive = true;
            detectedMorse = '';
            detectBeeps();
        } catch (err) {
            console.error('Microphone error:', err.name, err.message);
            throw err;
        }
    }

    function stop() {
        detectionActive = false;
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
    }

    function detectBeeps() {
        if (!detectionActive) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        if (average > THRESHOLD) {
            // Beep detected
            if (!detectedMorse.endsWith('.') && !detectedMorse.endsWith('-')) {
                const now = Date.now();
                if (window.lastBeepTime === undefined) {
                    window.lastBeepTime = now;
                    window.beepStart = now;
                }
                window.lastBeepTime = now;
            }
        } else {
            // No beep
            if (window.lastBeepTime !== undefined && window.beepStart !== undefined) {
                const duration = window.lastBeepTime - window.beepStart;
                if (duration > 50) {
                    if (duration > 150) {
                        detectedMorse += '-';
                    } else {
                        detectedMorse += '.';
                    }
                    if (onDetectionUpdate) onDetectionUpdate(detectedMorse);
                }
                window.lastBeepTime = undefined;
                window.beepStart = undefined;
            }

            // Detect word/letter gaps
            if (window.lastSilenceStart === undefined) {
                window.lastSilenceStart = Date.now();
            }
            
            if (Date.now() - window.lastSilenceStart > 300) {
                if (detectedMorse && !detectedMorse.endsWith(' ')) {
                    detectedMorse += ' ';
                    if (onDetectionUpdate) onDetectionUpdate(detectedMorse);
                }
            }
        }

        requestAnimationFrame(detectBeeps);
    }

    return {
        start: start,
        stop: stop,
        getMorse: () => detectedMorse,
        reset: () => { detectedMorse = ''; }
    };
})();
