// Peer discovery module
const PeerDiscovery = (() => {
    let myCode = null;
    let myUsername = null;
    let scanInterval = null;

    function setCode(code) {
        myCode = code;
    }

    function setUsername(username) {
        myUsername = username;
    }

    async function scanPeers() {
        try {
            const response = await fetch('/api/peers');
            const peers = await response.json();
            
            // Filter out self
            return peers.filter(p => p.code !== myCode);
        } catch (err) {
            console.error('Scan error:', err);
            return [];
        }
    }

    async function registerSelf() {
        if (!myCode || !myUsername) return false;
        
        try {
            const response = await fetch(`/api/register?code=${myCode}&username=${encodeURIComponent(myUsername)}`, { method: 'POST' });
            return response.ok;
        } catch (err) {
            console.error('Register error:', err);
            return false;
        }
    }

    async function unregisterSelf() {
        if (!myCode) return;
        
        try {
            await fetch(`/api/unregister?code=${myCode}`, { method: 'DELETE' });
        } catch (err) {
            console.error('Unregister error:', err);
        }
    }

    function startContinuousRegistration() {
        registerSelf();
        scanInterval = setInterval(() => registerSelf(), 10000); // Re-register every 10s
    }

    function stopContinuousRegistration() {
        if (scanInterval) clearInterval(scanInterval);
        unregisterSelf();
    }

    return {
        setCode: setCode,
        setUsername: setUsername,
        scanPeers: scanPeers,
        startRegistration: startContinuousRegistration,
        stopRegistration: stopContinuousRegistration
    };
})();
