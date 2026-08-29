// Web Audio API Synthesizer for In-App Ringing Alarm

let audioCtx: AudioContext | null = null;
let alarmIntervalId: any = null;
let isRinging = false;

export function playAlarmSound(): void {
  if (typeof window === 'undefined') return;
  if (isRinging) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    isRinging = true;

    // Function to play a single two-tone alarm chime beep (880Hz -> 1046.5Hz)
    const playChimeBeep = () => {
      if (!audioCtx || audioCtx.state === 'closed' || !isRinging) return;

      const now = audioCtx.currentTime;

      // Tone 1: High A5 (880Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Tone 2: High C6 (1046.5Hz) 100ms later
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, now + 0.1);
      gain2.gain.setValueAtTime(0.35, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.25);
    };

    // Play immediately, then repeat every 500ms
    playChimeBeep();
    alarmIntervalId = setInterval(playChimeBeep, 500);
  } catch (e) {
    console.warn('[AlarmAudio] Failed to initialize Web Audio context:', e);
  }
}

export function stopAlarmSound(): void {
  isRinging = false;

  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }

  if (audioCtx) {
    try {
      if (audioCtx.state !== 'closed') {
        audioCtx.close();
      }
    } catch (e) {
      console.warn('[AlarmAudio] Error closing AudioContext:', e);
    }
    audioCtx = null;
  }
}
