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

// Safely access vendor-prefixed SpeechRecognition at runtime
const getSpeechRecognitionCtor = (): (new () => AnySpeechRecognition) | null => {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export function VoiceInput({ onTranscript, onInterim, disabled = false }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported] = useState(() => getSpeechRecognitionCtor() !== null);
  const [showTooltip, setShowTooltip] = useState(false);
  const recognitionRef = useRef<AnySpeechRecognition>(null);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore errors on stop
      }
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

    recognition.onstart = () => {
      setIsRecording(true);
    };

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

      if (interimText && onInterim) {
        onInterim(interimText);
      }

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecognition();
    };
  }, [stopRecognition]);

  const tooltipText = !isSupported
    ? "Voice not supported in this browser"
    : isRecording
    ? "Listening…"
    : "Click to speak";

  if (!isSupported) {
    return (
      <div className="relative inline-flex">
        <button
          type="button"
          disabled
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="relative flex items-center justify-center w-11 h-11 rounded-full text-muted-foreground/40 cursor-not-allowed"
          aria-label="Voice input not supported"
        >
          <MicOff className="w-4 h-4" />
        </button>
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-foreground text-background rounded whitespace-nowrap z-50 pointer-events-none">
            Voice not supported in this browser
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={tooltipText}
        className={cn(
          "relative flex items-center justify-center w-11 h-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isRecording
            ? "text-red-500 bg-red-500/10 hover:bg-red-500/15"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* Pulsing ring when recording */}
        {isRecording && (
          <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-60" />
        )}

        <Mic className="w-4 h-4 relative z-10" />

        {/* Waveform bars animation */}
        {isRecording && (
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-end gap-px" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-0.5 bg-red-500 rounded-full voice-bar"
                style={{
                  height: "12px",
                  animation: "voiceBar 0.6s ease-in-out infinite alternate",
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-foreground text-background rounded whitespace-nowrap z-50 pointer-events-none">
          {tooltipText}
        </div>
      )}

      {/* Keyframe animation injected once */}
      <style>{`
        @keyframes voiceBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
