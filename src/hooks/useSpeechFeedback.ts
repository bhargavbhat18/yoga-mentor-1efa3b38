import { useRef, useCallback, useState } from 'react';

interface SpeechFeedbackOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useSpeechFeedback(options: SpeechFeedbackOptions = {}) {
  const { rate = 0.95, pitch = 1, volume = 1 } = options;
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const lastAnnouncedPoseRef = useRef<string>('');
  const lastPoseChangeTimeRef = useRef<number>(0);
  const lastFeedbackRef = useRef<string>('');
  const announcementCooldownRef = useRef<number>(0);
  
  // Track recent pose detections for stability
  const recentPosesRef = useRef<string[]>([]);
  const currentStablePoseRef = useRef<string>('');
  
  // Configuration
  const SAME_POSE_COOLDOWN = 10000; // 10 seconds before repeating same pose
  const ANNOUNCEMENT_COOLDOWN = 3500; // 3.5 seconds between any announcements
  const REQUIRED_STABLE_DETECTIONS = 8; // Need 8 consistent detections
  const POSE_HISTORY_SIZE = 12; // Track last 12 detections
  const STABILITY_THRESHOLD = 0.65; // 65% of recent detections must match

  // Clean pose name for speech (remove Sanskrit in parentheses)
  const getSpokenPoseName = useCallback((poseName: string): string => {
    const match = poseName.match(/^([^(]+)/);
    if (match) {
      return match[1].trim();
    }
    return poseName;
  }, []);

  // Get concise feedback for speech
  const getConciseFeedback = useCallback((feedback: string): string => {
    const sentences = feedback.split(/[.!]/);
    if (sentences.length > 0) {
      return sentences[0].trim();
    }
    return feedback;
  }, []);

  // Check if a pose is stable in recent history
  const checkPoseStability = useCallback((poseName: string): boolean => {
    const history = recentPosesRef.current;
    if (history.length < REQUIRED_STABLE_DETECTIONS) return false;
    
    const matchCount = history.filter(p => p === poseName).length;
    const stabilityRatio = matchCount / history.length;
    
    return stabilityRatio >= STABILITY_THRESHOLD;
  }, []);

  // Get the most stable pose from recent history
  const getMostStablePose = useCallback((): string | null => {
    const history = recentPosesRef.current;
    if (history.length < REQUIRED_STABLE_DETECTIONS) return null;
    
    // Count occurrences of each pose
    const counts: Record<string, number> = {};
    history.forEach(pose => {
      counts[pose] = (counts[pose] || 0) + 1;
    });
    
    // Find the most common pose
    let maxCount = 0;
    let mostCommon = '';
    Object.entries(counts).forEach(([pose, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = pose;
      }
    });
    
    // Only return if it meets stability threshold
    if (maxCount / history.length >= STABILITY_THRESHOLD) {
      return mostCommon;
    }
    
    return null;
  }, []);

  const speakPose = useCallback((poseName: string, feedback: string) => {
    if (!isEnabled || !('speechSynthesis' in window)) return;

    const now = Date.now();
    
    // Handle visibility warnings - these bypass stability checks
    const isWarning = poseName === 'Show Full Body' || poseName === 'Move Back';
    
    if (isWarning) {
      // Clear pose history on warnings
      recentPosesRef.current = [];
      currentStablePoseRef.current = '';
      
      // Only repeat warning after longer cooldown
      if (poseName === lastAnnouncedPoseRef.current && 
          now - lastPoseChangeTimeRef.current < SAME_POSE_COOLDOWN * 1.5) {
        return;
      }
      
      // Check global cooldown
      if (now - announcementCooldownRef.current < ANNOUNCEMENT_COOLDOWN) {
        return;
      }
      
      announceText(feedback);
      lastAnnouncedPoseRef.current = poseName;
      lastPoseChangeTimeRef.current = now;
      announcementCooldownRef.current = now;
      return;
    }

    // Add to pose history
    recentPosesRef.current.push(poseName);
    if (recentPosesRef.current.length > POSE_HISTORY_SIZE) {
      recentPosesRef.current.shift();
    }

    // Get the most stable pose from history
    const stablePose = getMostStablePose();
    
    // If no stable pose yet, wait
    if (!stablePose) {
      return;
    }

    // If stable pose hasn't changed, don't announce again (unless cooldown passed)
    if (stablePose === currentStablePoseRef.current) {
      // Maybe update feedback if it changed significantly after long time
      if (now - lastPoseChangeTimeRef.current > SAME_POSE_COOLDOWN &&
          feedback !== lastFeedbackRef.current &&
          now - announcementCooldownRef.current > ANNOUNCEMENT_COOLDOWN) {
        const conciseFeedback = getConciseFeedback(feedback);
        announceText(conciseFeedback);
        lastFeedbackRef.current = feedback;
        announcementCooldownRef.current = now;
      }
      return;
    }

    // New stable pose detected - check cooldown
    if (now - announcementCooldownRef.current < ANNOUNCEMENT_COOLDOWN) {
      return;
    }

    // Verify the new pose is actually stable (double-check)
    if (!checkPoseStability(stablePose)) {
      return;
    }

    // Announce the new stable pose
    const spokenName = getSpokenPoseName(stablePose);
    const conciseFeedback = getConciseFeedback(feedback);
    const announcement = `${spokenName}. ${conciseFeedback}`;
    
    announceText(announcement);
    
    currentStablePoseRef.current = stablePose;
    lastAnnouncedPoseRef.current = stablePose;
    lastFeedbackRef.current = feedback;
    lastPoseChangeTimeRef.current = now;
    announcementCooldownRef.current = now;
    
  }, [isEnabled, getSpokenPoseName, getConciseFeedback, getMostStablePose, checkPoseStability]);

  const announceText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

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
    announcementCooldownRef.current = 0;
    recentPosesRef.current = [];
    currentStablePoseRef.current = '';
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
