(function () {
    'use strict';

    const state = {
        connected: false,
        peerCode: null,
        peerName: null,
        myUsername: null,
        lastMorse: null,
        incomingRequest: null
    };

    const screens = {
        join: document.getElementById('join-screen'),
        discovery: document.getElementById('discovery-screen'),
        chat: document.getElementById('chat-screen')
    };

    const els = {
        usernameInput: document.getElementById('username-input'),
        joinBtn: document.getElementById('join-btn'),
        myInfo: document.getElementById('my-info'),
        myName: document.getElementById('my-name'),
        peersList: document.getElementById('peers-list'),
        leaveBtn: document.getElementById('leave-btn'),
        peerName: document.getElementById('peer-name'),
        peerCode: document.getElementById('peer-code'),
        backBtn: document.getElementById('back-btn'),
        chatMessages: document.getElementById('chat-messages'),
        messageInput: document.getElementById('message-input'),
        sendBtn: document.getElementById('send-btn'),
        connectionModal: document.getElementById('connection-modal'),
        requestFrom: document.getElementById('request-from'),
        requestMsg: document.getElementById('request-msg'),
        acceptBtn: document.getElementById('accept-btn'),
        rejectBtn: document.getElementById('reject-btn'),
        connectionStatus: document.getElementById('connection-status'),
        statusText: document.getElementById('status-text'),
        statusPeerName: document.getElementById('status-peer-name')
    };

    function showScreen(name) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[name].classList.add('active');
    }

    function showConnectionRequest(username, peerCode) {
        state.incomingRequest = peerCode;
        els.requestFrom.textContent = username;
        els.requestMsg.textContent = 'wants to connect with you';
        els.connectionModal.classList.add('active');
    }

    function hideConnectionRequest() {
        els.connectionModal.classList.remove('active');
        state.incomingRequest = null;
    }

    function showConnectionStatus(peerName, isWaiting = true) {
        els.statusPeerName.textContent = peerName;
        if (isWaiting) {
            els.statusText.innerHTML = `Waiting for <strong>${peerName}</strong> to accept...`;
            els.connectionStatus.classList.add('pending');
        } else {
            els.statusText.innerHTML = `Connected to <strong>${peerName}</strong>`;
            els.connectionStatus.classList.remove('pending');
        }
        els.connectionStatus.style.display = 'flex';
    }

    function hideConnectionStatus() {
        els.connectionStatus.style.display = 'none';
    }

    function updateStatus(msg) {
        console.log(msg);
    }

    function handleServerMessage(msg) {
        console.log('Message:', msg.type);

        switch (msg.type) {
            case 'ASSIGN_CODE':
                WebSocketHandler.setCode(msg.code);
                els.myInfo.innerHTML = `Your Code: <strong>${msg.code}</strong> | Name: <strong id="my-name">${state.myUsername}</strong>`;
                PeerDiscovery.setCode(msg.code);
                PeerDiscovery.setUsername(state.myUsername);
                PeerDiscovery.startRegistration();
                break;

            case 'CONNECTION_REQUEST':
                showConnectionRequest(msg.username, msg.code);
                break;

            case 'CONNECTION_PENDING':
                showConnectionStatus(state.peerName, true);
                updateStatus('Waiting for ' + state.peerName + ' to accept...');
                break;

            case 'CONNECTED':
                state.connected = true;
                state.peerCode = msg.peerCode;
                els.peerCode.textContent = 'Code: ' + msg.peerCode;
                els.messageInput.disabled = false;
                els.sendBtn.disabled = false;
                hideConnectionRequest();
                showConnectionStatus(state.peerName, false);
                setTimeout(() => hideConnectionStatus(), 2000);
                updateStatus('Connected to ' + msg.peerCode);
                break;

            case 'CONNECTION_REJECTED':
                hideConnectionStatus();
                showConnectionStatus(state.peerName, false);
                els.statusText.innerHTML = `<strong>${state.peerName}</strong> rejected your connection`;
                els.statusText.style.color = '#ff6b6b';
                setTimeout(() => {
                    hideConnectionStatus();
                    showScreen('discovery');
                    els.chatMessages.innerHTML = '';
                    updateStatus('Connection rejected');
                }, 3000);
                break;

            case 'PEER_DISCONNECTED':
                state.connected = false;
                showScreen('discovery');
                updateStatus('Peer disconnected');
                break;

            case 'RECEIVE_TEXT':
                addMessage(msg.text, msg.morse, 'received', msg.username);
                break;

            case 'SENT_CONFIRM':
                addMessage(msg.text, msg.morse, 'sent', state.myUsername);
                els.messageInput.value = '';
                break;

            case 'ERROR':
                updateStatus('Error: ' + (msg.text || 'Unknown error'));
                break;
        }
    }

    function addMessage(text, morse, direction, username) {
        const div = document.createElement('div');
        div.className = 'message ' + direction;
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        const userLabel = document.createElement('div');
        userLabel.className = 'message-user';
        userLabel.textContent = username || 'Unknown';
        
        const textDiv = document.createElement('div');
        textDiv.textContent = text;
        
        const morseDiv = document.createElement('div');
        morseDiv.className = 'message-morse';
        morseDiv.style.cursor = 'pointer';
        morseDiv.innerHTML = `<strong>${morse}</strong>`;
        morseDiv.addEventListener('click', () => {
            MorseAudio.play(morse);
        });
        
        bubble.appendChild(userLabel);
        bubble.appendChild(textDiv);
        bubble.appendChild(morseDiv);
        
        div.appendChild(bubble);
        els.chatMessages.appendChild(div);
        els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
    }

    async function scanAndShowPeers() {
        const peers = await PeerDiscovery.scanPeers();
        
        els.peersList.innerHTML = '';
        if (peers.length === 0) {
            els.peersList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No peers nearby</p>';
        } else {
            peers.forEach(peer => {
                const btn = document.createElement('button');
                btn.className = 'peer-btn';
                btn.innerHTML = `<div class="peer-name">${peer.username}</div><div class="peer-code">Code: ${peer.code}</div>`;
                btn.addEventListener('click', () => connectToPeer(peer.code, peer.username));
                els.peersList.appendChild(btn);
            });
        }
    }

    function connectToPeer(peerCode, peerName) {
        state.peerName = peerName;
        state.peerCode = peerCode;
        els.peerName.textContent = peerName;
        els.peerCode.textContent = 'Code: ' + peerCode;
        els.chatMessages.innerHTML = '';
        showScreen('chat');
        
        WebSocketHandler.send({
            type: 'CONNECT',
            targetCode: peerCode,
            username: state.myUsername
        });
    }

    function sendMessage() {
        const text = els.messageInput.value.trim();
        if (!text || !state.connected) return;

        const morse = MorseEncoder.toMorse(text);
        WebSocketHandler.send({
            type: 'SEND_TEXT',
            text: text,
            morse: morse,
            username: state.myUsername
        });
    }

    // Event listeners
    els.joinBtn.addEventListener('click', () => {
        const username = els.usernameInput.value.trim();
        if (!username) {
            alert('Please enter your name');
            return;
        }
        state.myUsername = username;
        showScreen('discovery');
        WebSocketHandler.connect(handleServerMessage, updateStatus);
        
        // Start scanning for peers
        const scanInterval = setInterval(scanAndShowPeers, 2000);
        els.leaveBtn.addEventListener('click', () => {
            clearInterval(scanInterval);
            PeerDiscovery.stopRegistration();
            showScreen('join');
            els.usernameInput.value = '';
            state.myUsername = null;
        }, { once: true });
    });

    els.leaveBtn.addEventListener('click', () => {
        PeerDiscovery.stopRegistration();
        WebSocketHandler.disconnect();
        showScreen('join');
        els.usernameInput.value = '';
        state.myUsername = null;
        state.connected = false;
    });

    els.backBtn.addEventListener('click', () => {
        if (state.connected) {
            WebSocketHandler.send({ type: 'DISCONNECT' });
        }
        state.connected = false;
        showScreen('discovery');
        els.chatMessages.innerHTML = '';
    });

    els.sendBtn.addEventListener('click', sendMessage);
    els.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Allow enter on join
    els.usernameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') els.joinBtn.click();
    });

    // Connection request modal
    els.acceptBtn.addEventListener('click', () => {
        if (state.incomingRequest) {
            WebSocketHandler.send({
                type: 'ACCEPT_CONNECTION',
                code: state.incomingRequest
            });
            hideConnectionRequest();
            showScreen('chat');
        }
    });

    els.rejectBtn.addEventListener('click', () => {
        if (state.incomingRequest) {
            WebSocketHandler.send({
                type: 'REJECT_CONNECTION',
                code: state.incomingRequest
            });
            hideConnectionRequest();
        }
    });
})();
