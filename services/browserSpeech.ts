/**
 * Browser SpeechSynthesis helper for one-off pronunciations (free, offline,
 * no API cost). Long-form narration uses Gemini TTS instead.
 */
export function speakText(text: string, rate = 0.9): void {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => v.name.includes('Google US English')) ||
    voices.find((v) => v.lang === 'en-US');
  if (preferred) utterance.voice = preferred;
  window.speechSynthesis.speak(utterance);
}
