using System.Text;

namespace MorseShare.Services;

public class MorseService
{
    private static readonly Dictionary<char, string> EnglishToMorseMap = new()
    {
        { 'A', ".-" }, { 'B', "-..." }, { 'C', "-.-." }, { 'D', "-.." }, { 'E', "." },
        { 'F', "..-." }, { 'G', "--." }, { 'H', "...." }, { 'I', ".." }, { 'J', ".---" },
        { 'K', "-.-" }, { 'L', ".-.." }, { 'M', "--" }, { 'N', "-." }, { 'O', "---" },
        { 'P', ".--." }, { 'Q', "--.-" }, { 'R', ".-." }, { 'S', "..." }, { 'T', "-" },
        { 'U', "..-" }, { 'V', "...-" }, { 'W', ".--" }, { 'X', "-..-" }, { 'Y', "-.--" },
        { 'Z', "--.." },
        { '0', "-----" }, { '1', ".----" }, { '2', "..---" }, { '3', "...--" }, { '4', "....-" },
        { '5', "....." }, { '6', "-...." }, { '7', "--..." }, { '8', "---.." }, { '9', "----." },
        { '.', ".-.-.-" }, { ',', "--..--" }, { '?', "..--.." }, { '!', "-.-.--" }, { '/', "-..-." },
        { '@', ".--.-." }, { '-', "-....-" }, { ':', "---..." }
    };

    private static readonly Dictionary<string, char> MorseToEnglishMap = 
        EnglishToMorseMap.ToDictionary(kvp => kvp.Value, kvp => kvp.Key);

    public string ToMorse(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        var result = new StringBuilder();
        var words = text.ToUpperInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries);

        for (int i = 0; i < words.Length; i++)
        {
            var word = words[i];
            var letterCodes = new List<string>();

            foreach (var ch in word)
            {
                if (EnglishToMorseMap.TryGetValue(ch, out var morseCode))
                {
                    letterCodes.Add(morseCode);
                }
            }

            result.Append(string.Join(" ", letterCodes));

            if (i < words.Length - 1)
            {
                result.Append(" / "); // Separator between words
            }
        }

        return result.ToString();
    }

    public string ToEnglish(string morse)
    {
        if (string.IsNullOrWhiteSpace(morse)) return string.Empty;

        var result = new StringBuilder();
        var words = morse.Split(new[] { " / " }, StringSplitOptions.None);

        for (int i = 0; i < words.Length; i++)
        {
            var word = words[i];
            var letters = word.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            foreach (var letter in letters)
            {
                if (MorseToEnglishMap.TryGetValue(letter, out var ch))
                {
                    result.Append(ch);
                }
            }

            if (i < words.Length - 1)
            {
                result.Append(' ');
            }
        }

        return result.ToString();
    }
}
