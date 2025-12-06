import { useRef, useCallback, useState } from 'react';

interface SpeechFeedbackOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useSpeechFeedback(options: SpeechFeedbackOptions = {}) {
  const { rate = 1, pitch = 1, volume = 1 } = options;
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastSpokenRef = useRef<string>('');
  const lastSpeakTimeRef = useRef<number>(0);
  const minIntervalMs = 4000; // Minimum 4 seconds between announcements

  const speak = useCallback((text: string, force = false) => {
    if (!isEnabled || !('speechSynthesis' in window)) return;

    const now = Date.now();
    const timeSinceLastSpeak = now - lastSpeakTimeRef.current;

    // Avoid repeating the same message too frequently
    if (!force && text === lastSpokenRef.current && timeSinceLastSpeak < minIntervalMs) {
      return;
    }

    // Don't interrupt if already speaking (unless forced)
    if (!force && isSpeaking) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    lastSpokenRef.current = text;
    lastSpeakTimeRef.current = now;
  }, [isEnabled, isSpeaking, rate, pitch, volume]);

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const toggle = useCallback(() => {
    setIsEnabled(prev => {
      if (prev) {
        // Turning off - stop any current speech
        stop();
      }
      return !prev;
    });
  }, [stop]);

  return {
    speak,
    stop,
    toggle,
    isEnabled,
    isSpeaking,
    setIsEnabled
  };
}
