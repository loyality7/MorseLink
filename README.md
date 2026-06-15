# Morse Link V1

Local network text messaging with Morse code.

## Run

```bash
dotnet run
```

Open `http://localhost:5050` in two browser tabs.

1. Enter your name
2. Click on someone nearby to connect
3. They get a popup to accept/reject
4. Type and send messages
5. Click Morse code to hear it

Done.un

```bash
dotnet run
```

Server starts on `http://localhost:5050`

To access from another device on the same network, use the Network URL shown in the terminal output.




## Message Format

All WebSocket messages are JSON:

```json
{
  "type": "SEND_TEXT",
  "text": "hello",
  "morse": ".... . .-.. .-.. ---",
  "username": "alice",
  "code": "1234"
}
```

## Connection Flow

1. User joins → Server assigns unique 4-digit code
2. User registers with discovery service (re-registers every 10s)
3. App scans for nearby peers every 2 seconds
4. User clicks peer → Sends CONNECTION_REQUEST
5. Peer gets modal to accept/reject
6. If accepted → Both connected, can exchange messages
7. When closing → Automatically unregisters from discovery

## Morse Code Timing

- Dot: 100ms
- Dash: 300ms
- Gap between symbols: 100ms
- Gap between letters: 300ms
- Gap between words: 700ms

Frequency: 800 Hz

## Known Limitations V1

- Text only (no images/files)
- One connection at a time per user
- No persistent history
- Local network only
- No authentication/encryption
- 4-digit codes not user-friendly for manual entry

## Next Steps (V2+)

- Speech-to-text input
- Flash animation on incoming messages
- Multiple simultaneous connections
- File sharing with Morse animation
- QR code for connection sharing
- Learn mode with timing control
- Device persistence with local storage
