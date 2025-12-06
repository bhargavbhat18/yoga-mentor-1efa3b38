import { useRef, useCallback, useState } from 'react';

interface SpeechFeedbackOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface AnnouncementQueue {
  poseName: string;
  feedback: string;
  timestamp: number;
}

export function useSpeechFeedback(options: SpeechFeedbackOptions = {}) {
  const { rate = 0.95, pitch = 1, volume = 1 } = options;
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const lastAnnouncedPoseRef = useRef<string>('');
  const lastPoseChangeTimeRef = useRef<number>(0);
  const lastFeedbackRef = useRef<string>('');
  const poseStableCountRef = useRef<number>(0);
  const announcementCooldownRef = useRef<number>(0);
  
  // Minimum time before announcing same pose again (8 seconds)
  const SAME_POSE_COOLDOWN = 8000;
  // Minimum time pose must be stable before announcing (reduces jitter)
  const POSE_STABILITY_THRESHOLD = 500;
  // Cooldown between any announcements (3 seconds)
  const ANNOUNCEMENT_COOLDOWN = 3000;
  // Required stable frames before announcing
  const REQUIRED_STABLE_FRAMES = 3;

  // Clean pose name for speech (remove Sanskrit in parentheses for cleaner audio)
  const getSpokenPoseName = useCallback((poseName: string): string => {
    // Extract just the English name for cleaner speech
    const match = poseName.match(/^([^(]+)/);
    if (match) {
      return match[1].trim();
    }
    return poseName;
  }, []);

  // Get concise feedback for speech
  const getConciseFeedback = useCallback((feedback: string): string => {
    // Shorten feedback for speech - take first sentence or key instruction
    const sentences = feedback.split(/[.!]/);
    if (sentences.length > 0) {
      return sentences[0].trim();
    }
    return feedback;
  }, []);

  const speakPose = useCallback((poseName: string, feedback: string) => {
    if (!isEnabled || !('speechSynthesis' in window)) return;

    const now = Date.now();
    
    // Check global cooldown
    if (now - announcementCooldownRef.current < ANNOUNCEMENT_COOLDOWN) {
      return;
    }

    // Handle visibility warnings differently - always announce if different
    const isWarning = poseName === 'Show Full Body' || poseName === 'Move Back';
    
    if (isWarning) {
      // Only repeat warning after longer cooldown
      if (poseName === lastAnnouncedPoseRef.current && 
          now - lastPoseChangeTimeRef.current < SAME_POSE_COOLDOWN * 1.5) {
        return;
      }
      
      // Announce warning
      announceText(feedback);
      lastAnnouncedPoseRef.current = poseName;
      lastPoseChangeTimeRef.current = now;
      announcementCooldownRef.current = now;
      return;
    }

    // For actual poses - check stability
    if (poseName === lastAnnouncedPoseRef.current) {
      poseStableCountRef.current++;
      
      // Same pose detected multiple times - maybe give encouragement after a while
      if (poseStableCountRef.current > 20 && 
          now - lastPoseChangeTimeRef.current > SAME_POSE_COOLDOWN &&
          feedback !== lastFeedbackRef.current) {
        // Announce updated feedback for same pose
        const conciseFeedback = getConciseFeedback(feedback);
        announceText(conciseFeedback);
        lastFeedbackRef.current = feedback;
        announcementCooldownRef.current = now;
        lastPoseChangeTimeRef.current = now;
      }
      return;
    }

    // New pose detected - require stability
    poseStableCountRef.current++;
    
    if (poseStableCountRef.current < REQUIRED_STABLE_FRAMES) {
      return; // Wait for pose to stabilize
    }

    // Pose is stable and different - announce it
    const spokenName = getSpokenPoseName(poseName);
    const conciseFeedback = getConciseFeedback(feedback);
    
    // Build natural announcement
    const announcement = `${spokenName}. ${conciseFeedback}`;
    
    announceText(announcement);
    
    lastAnnouncedPoseRef.current = poseName;
    lastFeedbackRef.current = feedback;
    lastPoseChangeTimeRef.current = now;
    announcementCooldownRef.current = now;
    poseStableCountRef.current = 0;
    
  }, [isEnabled, getSpokenPoseName, getConciseFeedback]);

  const announceText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    utterance.lang = 'en-US';

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [rate, pitch, volume]);

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const toggle = useCallback(() => {
    setIsEnabled(prev => {
      if (prev) {
        stop();
      }
      return !prev;
    });
  }, [stop]);

  const reset = useCallback(() => {
    lastAnnouncedPoseRef.current = '';
    lastFeedbackRef.current = '';
    lastPoseChangeTimeRef.current = 0;
    poseStableCountRef.current = 0;
    announcementCooldownRef.current = 0;
  }, []);

  return {
    speakPose,
    stop,
    toggle,
    reset,
    isEnabled,
    isSpeaking,
    setIsEnabled
  };
}
