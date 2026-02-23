let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(frequency: number, durationMs: number, startDelay = 0) {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.3;

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const startTime = ctx.currentTime + startDelay;
  oscillator.start(startTime);
  oscillator.stop(startTime + durationMs / 1000);
}

export function playLevelEndAlert() {
  // Three ascending beeps: 440hz, 550hz, 660hz, each 200ms
  playTone(440, 200, 0);
  playTone(550, 200, 0.25);
  playTone(660, 200, 0.5);
}

export function playBreakAlert() {
  // One long tone: 440hz, 800ms
  playTone(440, 800, 0);
}

export function announceLevel(
  levelNumber: number,
  smallBlind: number,
  bigBlind: number,
  ante: number
) {
  if (!("speechSynthesis" in window)) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  let text = `Level ${levelNumber}. Blinds are ${smallBlind} and ${bigBlind}.`;
  if (ante > 0) {
    text += ` Ante ${ante}.`;
  }

  const utterance = new SpeechSynthesisUtterance(text);

  // Pick first available English voice
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find((v) => v.lang.startsWith("en"));
  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  utterance.rate = 0.9;
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
}
