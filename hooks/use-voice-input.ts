// @ts-nocheck
// TODO: Fix type errors
"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type VoiceInputState = "idle" | "listening" | "processing" | "error";

interface UseVoiceInputOptions {
  /** Language for speech recognition (default: "el-GR" for Greek) */
  language?: string;
  /** Callback when transcription is complete */
  onResult?: (transcript: string) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Continuous listening mode (default: false) */
  continuous?: boolean;
  /** Interim results (default: true) */
  interimResults?: boolean;
  /** Enable Voice Activity Detection - auto-stop after silence (default: false) */
  enableVAD?: boolean;
  /** Silence timeout in ms before auto-stopping (default: 1500) */
  silenceTimeoutMs?: number;
  /** Minimum speech duration in ms before VAD kicks in (default: 500) */
  minSpeechDurationMs?: number;
  /** Callback when VAD detects end of speech */
  onSpeechEnd?: () => void;
}

interface UseVoiceInputReturn {
  /** Current state of voice input */
  state: VoiceInputState;
  /** Current transcript (interim or final) */
  transcript: string;
  /** Whether speech recognition is supported */
  isSupported: boolean;
  /** Start listening */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Reset transcript and state */
  reset: () => void;
  /** Error message if any */
  error: string | null;
  /** Whether user is actively speaking (VAD) */
  isSpeaking: boolean;
}

// Patterns that indicate a sentence might be complete (Greek and common patterns)
const SENTENCE_END_PATTERNS = /[.!?;·]$|ευρώ|€|\d+\s*(τ\.?μ\.?|τετραγωνικά|μήνα|χρόνια)$/i;
const MIN_WORDS_FOR_COMPLETE = 5; // Minimum words to consider a statement "complete"

/**
 * Hook for speech-to-text input using the Web Speech API
 * Defaults to Greek language for the Greek real estate market
 * 
 * Features:
 * - Smart Voice Activity Detection (VAD) for automatic end-of-speech detection
 * - Content-aware silence detection (faster for complete sentences)
 * - Supports continuous listening mode
 */
export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    language = "el-GR",
    onResult,
    onError,
    continuous = false,
    interimResults = true,
    enableVAD = false,
    silenceTimeoutMs = 1200, // Reduced default for faster response
    minSpeechDurationMs = 400,
    onSpeechEnd,
  } = options;

  const [state, setState] = useState<VoiceInputState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  
  // VAD-related refs
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speechStartTimeRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  const lastResultTimeRef = useRef<number>(0);
  const lastTranscriptLengthRef = useRef<number>(0);

  // Check for browser support
  useEffect(() => {
    if (typeof globalThis.window === "undefined") {
      setIsSupported(false);
      return;
    }
    const SpeechRecognition = 
      globalThis.window.SpeechRecognition || globalThis.window.webkitSpeechRecognition;
    
    setIsSupported(!!SpeechRecognition);
  }, []);

  // Clear silence timeout
  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  // Check if transcript looks like a complete statement
  const isLikelyComplete = useCallback((text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    
    // Check for sentence-ending patterns
    if (SENTENCE_END_PATTERNS.test(trimmed)) return true;
    
    // Check if it has enough words to be substantial
    const wordCount = trimmed.split(/\s+/).length;
    return wordCount >= MIN_WORDS_FOR_COMPLETE;
  }, []);

  // Calculate dynamic timeout based on content
  const getSmartTimeout = useCallback((currentTranscript: string): number => {
    const trimmed = currentTranscript.trim();
    
    // Very short timeout if sentence looks complete
    if (SENTENCE_END_PATTERNS.test(trimmed)) {
      return Math.min(silenceTimeoutMs, 600); // Max 600ms for complete sentences
    }
    
    // Shorter timeout if we have substantial content
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount >= MIN_WORDS_FOR_COMPLETE) {
      return Math.min(silenceTimeoutMs, 900); // Max 900ms for substantial content
    }
    
    // Default timeout for short/incomplete content
    return silenceTimeoutMs;
  }, [silenceTimeoutMs]);

  // Start or reset silence timeout (called when speech activity changes)
  const startSilenceTimeout = useCallback((currentTranscript: string) => {
    clearSilenceTimeout();
    
    if (!enableVAD || !hasSpokenRef.current) return;
    
    // Only start timeout if user has spoken for minimum duration
    const speechDuration = speechStartTimeRef.current 
      ? Date.now() - speechStartTimeRef.current 
      : 0;
    
    if (speechDuration >= minSpeechDurationMs) {
      const timeout = getSmartTimeout(currentTranscript);
      
      silenceTimeoutRef.current = setTimeout(() => {
        // Silence detected - auto-stop
        if (recognitionRef.current && hasSpokenRef.current) {
          try {
            recognitionRef.current.stop();
            onSpeechEnd?.();
          } catch {
            // Ignore stop errors
          }
        }
      }, timeout);
    }
  }, [enableVAD, minSpeechDurationMs, clearSilenceTimeout, getSmartTimeout, onSpeechEnd]);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognition = 
      globalThis.window.SpeechRecognition || globalThis.window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = continuous || enableVAD; // VAD needs continuous mode
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState("listening");
      setError(null);
      setIsSpeaking(false);
      speechStartTimeRef.current = null;
      hasSpokenRef.current = false;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = finalTranscriptRef.current;
      let hasNewContent = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
          finalTranscriptRef.current = finalTranscript;
          hasNewContent = true;
        } else {
          interimTranscript += result[0].transcript;
          hasNewContent = true;
        }
      }

      setTranscript(finalTranscript + interimTranscript);
      
      // VAD: Track speaking state
      if (hasNewContent) {
        if (!speechStartTimeRef.current) {
          speechStartTimeRef.current = Date.now();
        }
        hasSpokenRef.current = true;
        setIsSpeaking(true);
        
        // Reset silence timeout on each result
        resetSilenceTimeout();
      }
    };

    // Handle speech end event (browser detected end of speech)
    recognition.onspeechend = () => {
      setIsSpeaking(false);
      // Browser detected silence - use a short timeout for final results
      if (enableVAD && hasSpokenRef.current) {
        clearSilenceTimeout();
        const currentTranscript = finalTranscriptRef.current.trim();
        // Use very short timeout since browser already detected speech end
        const timeout = isLikelyComplete(currentTranscript) ? 300 : 500;
        
        silenceTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
              onSpeechEnd?.();
            } catch {
              // Ignore
            }
          }
        }, timeout);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      clearSilenceTimeout();
      setIsSpeaking(false);
      let errorMessage: string;
      
      switch (event.error) {
        case "no-speech":
          // In VAD mode, no-speech is expected when waiting - don't treat as error
          if (enableVAD && !hasSpokenRef.current) {
            // Restart listening silently
            setState("idle");
            return;
          }
          errorMessage = "Δεν ακούστηκε ομιλία. Παρακαλώ δοκιμάστε ξανά.";
          break;
        case "audio-capture":
          errorMessage = "Δεν βρέθηκε μικρόφωνο. Ελέγξτε τις ρυθμίσεις σας.";
          break;
        case "not-allowed":
          errorMessage = "Η πρόσβαση στο μικρόφωνο δεν επιτρέπεται. Παρακαλώ δώστε άδεια.";
          break;
        case "network":
          errorMessage = "Σφάλμα δικτύου. Ελέγξτε τη σύνδεσή σας.";
          break;
        case "aborted":
          // User cancelled, not really an error
          setState("idle");
          return;
        default:
          errorMessage = `Σφάλμα: ${event.error}`;
      }

      setError(errorMessage);
      setState("error");
      onError?.(errorMessage);
    };

    recognition.onend = () => {
      clearSilenceTimeout();
      setIsSpeaking(false);
      
      if (state === "listening") {
        // Recognition ended naturally (not due to error)
        const finalText = finalTranscriptRef.current.trim();
        if (finalText) {
          onResult?.(finalText);
        }
        setState("idle");
      }
    };

    return recognition;
  }, [language, continuous, interimResults, enableVAD, onResult, onError, state, startSilenceTimeout, clearSilenceTimeout, onSpeechEnd, isLikelyComplete]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      const msg = "Η αναγνώριση ομιλίας δεν υποστηρίζεται σε αυτόν τον browser.";
      setError(msg);
      setState("error");
      onError?.(msg);
      return;
    }

    // Reset previous transcript and VAD state
    finalTranscriptRef.current = "";
    setTranscript("");
    setError(null);
    setIsSpeaking(false);
    speechStartTimeRef.current = null;
    hasSpokenRef.current = false;
    lastResultTimeRef.current = 0;
    lastTranscriptLengthRef.current = 0;
    clearSilenceTimeout();

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors from stopping
      }
    }

    // Create new recognition instance
    const recognition = initRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        const msg = "Αποτυχία εκκίνησης αναγνώρισης ομιλίας.";
        setError(msg);
        setState("error");
        onError?.(msg);
      }
    }
  }, [isSupported, initRecognition, onError, clearSilenceTimeout]);

  const stopListening = useCallback(() => {
    clearSilenceTimeout();
    setIsSpeaking(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors from stopping
      }
    }
    setState("idle");
  }, [clearSilenceTimeout]);

  const reset = useCallback(() => {
    stopListening();
    finalTranscriptRef.current = "";
    setTranscript("");
    setError(null);
    setState("idle");
    setIsSpeaking(false);
    speechStartTimeRef.current = null;
    hasSpokenRef.current = false;
    lastResultTimeRef.current = 0;
    lastTranscriptLengthRef.current = 0;
  }, [stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimeout();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors from stopping - this can happen if recognition is already stopped
          console.debug("Voice recognition cleanup:", e);
        }
      }
    };
  }, [clearSilenceTimeout]);

  return {
    state,
    transcript,
    isSupported,
    startListening,
    stopListening,
    reset,
    error,
    isSpeaking,
  };
}

// Type declarations for browsers
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
