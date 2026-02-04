"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

interface UseTTSOptions {
  voice?: TTSVoice;
  speed?: number; // 0.25 to 4.0
  autoPlay?: boolean;
}

interface UseTTSReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  setVoice: (voice: TTSVoice) => void;
  currentVoice: TTSVoice;
}

export function useTextToSpeech(options: UseTTSOptions = {}): UseTTSReturn {
  const { voice: initialVoice = "nova", speed = 1, autoPlay = true } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentVoice, setCurrentVoice] = useState<TTSVoice>(initialVoice);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim()) return;

      console.log("[TTS] Speaking:", text.substring(0, 50) + "...");

      // Stop any existing audio
      stop();

      setIsLoading(true);
      setError(null);

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/voice/text-to-speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            voice: currentVoice,
            speed,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const contentType = response.headers.get("content-type");
          let errorMessage = `TTS request failed: ${response.status}`;
          
          if (contentType?.includes("application/json")) {
            const errorData = await response.json().catch(() => ({}));
            errorMessage = errorData.error || errorMessage;
          }
          
          throw new Error(errorMessage);
        }

        // Get the audio blob
        const audioBlob = await response.blob();
        
        if (audioBlob.size === 0) {
          throw new Error("Received empty audio response");
        }
        
        const audioUrl = URL.createObjectURL(audioBlob);

        // Create and play audio element
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        // Set up event handlers before playing
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          setError("Αποτυχία αναπαραγωγής ήχου");
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.oncanplaythrough = () => {
          setIsLoading(false);
        };

        // Try to play
        if (autoPlay) {
          try {
            await audio.play();
            setIsPlaying(true);
            setIsLoading(false);
          } catch (playError: any) {
            console.error("Audio play() failed:", playError);
            setError(`Αποτυχία αναπαραγωγής: ${playError.message || "Άγνωστο σφάλμα"}`);
            setIsLoading(false);
            URL.revokeObjectURL(audioUrl);
          }
        } else {
          setIsLoading(false);
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          // Request was cancelled, not an error
          return;
        }
        const message = err.message || "Failed to generate speech";
        setError(message);
        setIsLoading(false);
      }
    },
    [currentVoice, speed, autoPlay, stop]
  );

  const setVoice = useCallback((voice: TTSVoice) => {
    setCurrentVoice(voice);
  }, []);

  return {
    speak,
    stop,
    isPlaying,
    isLoading,
    error,
    setVoice,
    currentVoice,
  };
}
