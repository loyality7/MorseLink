namespace MorseShare.Models;

public class MorseMessage
{
    public string Type { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string Morse { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string TargetCode { get; set; } = string.Empty;
    public string PeerCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
}
