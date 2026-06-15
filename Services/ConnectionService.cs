using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Security.Cryptography;

namespace MorseShare.Services;

public class ConnectedClient
{
    public string Code { get; set; } = string.Empty;
    public WebSocket Socket { get; set; } = null!;
    public string? PeerCode { get; set; }
}

public class ConnectionService
{
    private readonly ConcurrentDictionary<string, ConnectedClient> _clients = new();
    private readonly ConcurrentDictionary<string, string> _sessionToCodeMap = new(); // sessionId -> code

    public string GenerateUniqueCode()
    {
        while (true)
        {
            var code = RandomNumberGenerator.GetInt32(1000, 10000).ToString();
            if (!_clients.ContainsKey(code))
            {
                return code;
            }
        }
    }

    public void MapSessionToCode(string sessionId, string code)
    {
        _sessionToCodeMap[sessionId] = code;
    }

    public string? GetCodeForSession(string sessionId)
    {
        if (string.IsNullOrEmpty(sessionId))
            return null;
            
        _sessionToCodeMap.TryGetValue(sessionId, out var code);
        return code;
    }

    public ConnectedClient AddClient(string code, WebSocket socket)
    {
        var client = new ConnectedClient
        {
            Code = code,
            Socket = socket
        };
        _clients[code] = client;
        return client;
    }

    public ConnectedClient? RemoveClient(string code)
    {
        if (_clients.TryRemove(code, out var client))
        {
            // If linked to a peer, unlink the peer as well
            if (!string.IsNullOrEmpty(client.PeerCode) && _clients.TryGetValue(client.PeerCode, out var peer))
            {
                peer.PeerCode = null;
            }
            return client;
        }
        return null;
    }

    public bool LinkClients(string code1, string code2)
    {
        if (_clients.TryGetValue(code1, out var client1) && _clients.TryGetValue(code2, out var client2))
        {
            // If they were previously linked to others, unlink them first
            UnlinkClient(code1);
            UnlinkClient(code2);

            client1.PeerCode = code2;
            client2.PeerCode = code1;
            return true;
        }
        return false;
    }

    public void UnlinkClient(string code)
    {
        if (_clients.TryGetValue(code, out var client))
        {
            if (!string.IsNullOrEmpty(client.PeerCode) && _clients.TryGetValue(client.PeerCode, out var peer))
            {
                peer.PeerCode = null;
            }
            client.PeerCode = null;
        }
    }

    public ConnectedClient? GetClient(string code)
    {
        _clients.TryGetValue(code, out var client);
        return client;
    }

    public ConnectedClient? GetPeer(string code)
    {
        if (_clients.TryGetValue(code, out var client) && !string.IsNullOrEmpty(client.PeerCode))
        {
            _clients.TryGetValue(client.PeerCode, out var peer);
            return peer;
        }
        return null;
    }

    public int GetActiveCount()
    {
        return _clients.Count;
    }
}
