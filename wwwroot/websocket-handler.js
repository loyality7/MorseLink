// WebSocket communication module
const WebSocketHandler = (() => {
    let socket = null;
    let messageHandlers = {};
    let sessionId = sessionStorage.getItem('morseSessionId') || generateSessionId();
    let myCode = sessionStorage.getItem('morseCode') || null;

    function generateSessionId() {
        const id = Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('morseSessionId', id);
        return id;
    }

    function connect(onMessage, onStatusChange) {
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = proto + '//' + location.host + '/ws?sessionId=' + encodeURIComponent(sessionId);
        
        console.log('Connecting to WebSocket:', url);
        onStatusChange('Connecting...', '');
        socket = new WebSocket(url);

        socket.onopen = () => {
            console.log('WebSocket connected');
            onStatusChange('Connected', 'connected');
        };

        socket.onmessage = (ev) => {
            console.log('Message received:', ev.data);
            let msg;
            try { msg = JSON.parse(ev.data); } catch (e) { 
                console.error('Parse error:', e);
                return; 
            }
            onMessage(msg);
        };

        socket.onclose = () => {
            console.log('WebSocket closed');
            onStatusChange('Disconnected', 'error');
            setTimeout(() => connect(onMessage, onStatusChange), 2000);
        };

        socket.onerror = (err) => {
            console.error('WebSocket error:', err);
            onStatusChange('Connection Error', 'error');
        };
    }

    return {
        connect: connect,
        disconnect: () => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
        },
        send: (msg) => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(msg));
            }
        },
        setCode: (code) => {
            myCode = code;
            sessionStorage.setItem('morseCode', code);
        },
        getCode: () => myCode,
        getSessionId: () => sessionId
    };
})();
