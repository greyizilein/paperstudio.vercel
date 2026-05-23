import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  disabled?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

const getSpeechRecognitionCtor = (): (new () => AnySpeechRecognition) | null => {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export function VoiceInput({ onTranscript, onInterim, disabled = false }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported] = useState(() => getSpeechRecognitionCtor() !== null);
  const recognitionRef = useRef<AnySpeechRecognition>(null);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecognition = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => { setIsRecording(true); };

    recognition.onresult = (event: AnySpeechRecognition) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      if (interimText && onInterim) onInterim(interimText);
      if (finalText) {
        onTranscript(finalText);
        stopRecognition();
      }
    };

    recognition.onerror = (event: AnySpeechRecognition) => {
      console.error("[VoiceInput] Speech recognition error:", event.error);
      stopRecognition();
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error("[VoiceInput] Failed to start recognition:", err);
      stopRecognition();
    }
  }, [onTranscript, onInterim, stopRecognition]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (isRecording) {
      stopRecognition();
    } else {
      startRecognition();
    }
  }, [disabled, isRecording, stopRecognition, startRecognition]);

  useEffect(() => {
    return () => { stopRecognition(); };
  }, [stopRecognition]);

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        className="flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground/40 cursor-not-allowed"
        aria-label="Voice input not supported"
      >
        <MicOff className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={isRecording ? "Stop listening" : "Start voice input"}
      className={cn(
        "flex items-center justify-center w-9 h-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isRecording
          ? "text-red-500 bg-red-500/10 hover:bg-red-500/15 animate-pulse"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Mic className="w-4 h-4" />
    </button>
  );
}
