using System.Collections.Concurrent;

namespace MorseShare.Services;

public class PeerInfo
{
    public string Code { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
    public bool IsOnline { get; set; } = true;
}

public class PeerDiscoveryService
{
    private readonly ConcurrentDictionary<string, PeerInfo> _peers = new();
    private readonly Timer _cleanupTimer;

    public PeerDiscoveryService()
    {
        // Cleanup stale peers every 30 seconds
        _cleanupTimer = new Timer(_ => CleanupStalePeers(), null, TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(30));
    }

    public void RegisterPeer(string code, string username, string ipAddress)
    {
        _peers[code] = new PeerInfo
        {
            Code = code,
            Username = username,
            IpAddress = ipAddress,
            RegisteredAt = DateTime.UtcNow,
            IsOnline = true
        };
    }

    public void UnregisterPeer(string code)
    {
        _peers.TryRemove(code, out _);
    }

    public List<PeerInfo> GetAvailablePeers()
    {
        return _peers.Values
            .Where(p => p.IsOnline && (DateTime.UtcNow - p.RegisteredAt).TotalMinutes < 5)
            .ToList();
    }

    private void CleanupStalePeers()
    {
        var staleKeys = _peers
            .Where(kvp => (DateTime.UtcNow - kvp.Value.RegisteredAt).TotalMinutes > 5)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in staleKeys)
        {
            _peers.TryRemove(key, out _);
        }
    }
}
