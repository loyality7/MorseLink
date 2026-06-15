using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Net;
using MorseShare.Models;
using MorseShare.Services;

var builder = WebApplication.CreateBuilder(args);

// Get local IP address
var hostName = Dns.GetHostName();
var ipAddress = Dns.GetHostAddresses(hostName).FirstOrDefault(ip => ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);
var ipStr = ipAddress?.ToString() ?? "localhost";

// Configure to listen on port 5050
builder.WebHost.UseUrls("http://0.0.0.0:5050");

// Add services to the container.
builder.Services.AddSingleton<MorseService>();
builder.Services.AddSingleton<ConnectionService>();
builder.Services.AddSingleton<PeerDiscoveryService>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseWebSockets(new WebSocketOptions
{
    KeepAliveInterval = TimeSpan.FromSeconds(30)
});

// Log server startup info
app.Lifetime.ApplicationStarted.Register(() =>
{
    Console.WriteLine();
    Console.WriteLine("  MORSE LINK V1 RUNNING");
    Console.WriteLine();
    Console.WriteLine($"  Local:    http://localhost:5050");
    Console.WriteLine($"  Network:  http://{ipStr}:5050");
    Console.WriteLine();
});

app.MapGet("/api/peers", (PeerDiscoveryService discovery) =>
{
    return discovery.GetAvailablePeers();
});

app.MapPost("/api/register", (PeerDiscoveryService discovery, HttpContext context) =>
{
    var code = context.Request.Query["code"].ToString();
    var username = context.Request.Query["username"].ToString();
    if (string.IsNullOrEmpty(code)) return Results.BadRequest("Code required");
    
    discovery.RegisterPeer(code, username, ipStr);
    return Results.Ok(new { status = "registered", code = code });
});

app.MapDelete("/api/unregister", (PeerDiscoveryService discovery, HttpContext context) =>
{
    var code = context.Request.Query["code"].ToString();
    discovery.UnregisterPeer(code);
    return Results.Ok();
});

app.Map("/ws", async (HttpContext context, ConnectionService connectionService, MorseService morseService, PeerDiscoveryService peerDiscovery) =>
{
    if (context.WebSockets.IsWebSocketRequest)
    {
        using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        
        // Check if client has existing session ID
        var sessionId = context.Request.Query["sessionId"].ToString();
        var code = connectionService.GetCodeForSession(sessionId);
        
        // If no code exists for this session, generate new one
        if (string.IsNullOrEmpty(code))
        {
            code = connectionService.GenerateUniqueCode();
            if (!string.IsNullOrEmpty(sessionId))
            {
                connectionService.MapSessionToCode(sessionId, code);
            }
        }
        
        connectionService.AddClient(code, webSocket);

        // Notify client of their assigned code and session
        await SendJsonAsync(webSocket, new MorseMessage
        {
            Type = "ASSIGN_CODE",
            Code = code
        });

        await HandleWebSocketCommunication(code, webSocket, connectionService, morseService, peerDiscovery);
    }
    else
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
    }
});

async Task HandleWebSocketCommunication(string code, WebSocket webSocket, ConnectionService connectionService, MorseService morseService, PeerDiscoveryService peerDiscovery)
{
    var buffer = new byte[1024 * 4];
    try
    {
        while (webSocket.State == WebSocketState.Open)
        {
            var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                await CloseConnection(code, webSocket, connectionService, peerDiscovery);
                break;
            }

            if (result.MessageType == WebSocketMessageType.Text)
            {
                var messageJson = Encoding.UTF8.GetString(buffer, 0, result.Count);
                try
                {
                    var msg = JsonSerializer.Deserialize<MorseMessage>(messageJson, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    if (msg != null)
                    {
                        await ProcessMessage(code, msg, connectionService, morseService);
                    }
                }
                catch (JsonException)
                {
                    // Ignore malformed messages
                }
            }
        }
    }
    catch (Exception)
    {
        await CloseConnection(code, webSocket, connectionService, peerDiscovery);
    }
}

async Task ProcessMessage(string code, MorseMessage msg, ConnectionService connectionService, MorseService morseService)
{
    var client = connectionService.GetClient(code);
    if (client == null) return;

    if (msg.Type == "CONNECT")
    {
        var targetCode = msg.TargetCode;
        var senderUsername = msg.Username;
        
        if (targetCode == code)
        {
            await SendJsonAsync(client.Socket, new MorseMessage
            {
                Type = "ERROR",
                Status = "error",
                Text = "You cannot connect to yourself."
            });
            return;
        }

        var targetClient = connectionService.GetClient(targetCode);
        if (targetClient != null)
        {
            // Send connection request to target
            await SendJsonAsync(targetClient.Socket, new MorseMessage
            {
                Type = "CONNECTION_REQUEST",
                Code = code,
                Username = senderUsername
            });

            // Send pending to sender
            await SendJsonAsync(client.Socket, new MorseMessage
            {
                Type = "CONNECTION_PENDING",
                PeerCode = targetCode
            });
        }
        else
        {
            await SendJsonAsync(client.Socket, new MorseMessage
            {
                Type = "ERROR",
                Status = "error",
                Text = $"Code {targetCode} not found."
            });
        }
    }
    else if (msg.Type == "ACCEPT_CONNECTION")
    {
        var senderCode = msg.Code;
        var senderClient = connectionService.GetClient(senderCode);
        
        if (senderClient != null)
        {
            if (connectionService.LinkClients(code, senderCode))
            {
                // Send CONNECTED to both
                await SendJsonAsync(client.Socket, new MorseMessage
                {
                    Type = "CONNECTED",
                    PeerCode = senderCode
                });

                await SendJsonAsync(senderClient.Socket, new MorseMessage
                {
                    Type = "CONNECTED",
                    PeerCode = code
                });
            }
            else
            {
                await SendJsonAsync(client.Socket, new MorseMessage
                {
                    Type = "ERROR",
                    Status = "error",
                    Text = "Failed to connect to peer."
                });
            }
        }
        else
        {
            await SendJsonAsync(client.Socket, new MorseMessage
            {
                Type = "ERROR",
                Status = "error",
                Text = "Peer no longer available."
            });
        }
    }
    else if (msg.Type == "REJECT_CONNECTION")
    {
        var senderCode = msg.Code;
        var senderClient = connectionService.GetClient(senderCode);
        
        if (senderClient != null)
        {
            await SendJsonAsync(senderClient.Socket, new MorseMessage
            {
                Type = "CONNECTION_REJECTED",
                PeerCode = code
            });
        }
    }
    else if (msg.Type == "SEND_TEXT")
    {
        var peer = connectionService.GetPeer(code);
        var morse = morseService.ToMorse(msg.Text);

        // Send confirmation to sender
        await SendJsonAsync(client.Socket, new MorseMessage
        {
            Type = "SENT_CONFIRM",
            Text = msg.Text,
            Morse = morse,
            Username = msg.Username
        });

        if (peer != null && peer.Socket.State == WebSocketState.Open)
        {
            await SendJsonAsync(peer.Socket, new MorseMessage
            {
                Type = "RECEIVE_TEXT",
                Text = msg.Text,
                Morse = morse,
                Code = code,
                Username = msg.Username
            });
        }
        else
        {
            await SendJsonAsync(client.Socket, new MorseMessage
            {
                Type = "ERROR",
                Status = "error",
                Text = "No connected peer to receive the message."
            });
        }
    }
    else if (msg.Type == "DISCONNECT")
    {
        var peer = connectionService.GetPeer(code);
        connectionService.UnlinkClient(code);

        await SendJsonAsync(client.Socket, new MorseMessage
        {
            Type = "DISCONNECTED"
        });

        if (peer != null && peer.Socket.State == WebSocketState.Open)
        {
            await SendJsonAsync(peer.Socket, new MorseMessage
            {
                Type = "PEER_DISCONNECTED"
            });
        }
    }
}

async Task CloseConnection(string code, WebSocket webSocket, ConnectionService connectionService, PeerDiscoveryService peerDiscovery)
{
    var peer = connectionService.GetPeer(code);
    connectionService.RemoveClient(code);
    
    // Unregister from peer discovery
    peerDiscovery.UnregisterPeer(code);

    if (webSocket.State == WebSocketState.Open || webSocket.State == WebSocketState.CloseReceived)
    {
        try
        {
            await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Connection closed", CancellationToken.None);
        }
        catch { /* ignore */ }
    }

    if (peer != null && peer.Socket.State == WebSocketState.Open)
    {
        try
        {
            await SendJsonAsync(peer.Socket, new MorseMessage
            {
                Type = "PEER_DISCONNECTED"
            });
        }
        catch { /* ignore */ }
    }
}

async Task SendJsonAsync(WebSocket socket, MorseMessage message)
{
    if (socket.State == WebSocketState.Open)
    {
        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        var json = JsonSerializer.Serialize(message, options);
        var bytes = Encoding.UTF8.GetBytes(json);
        await socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
    }
}

app.Run();
