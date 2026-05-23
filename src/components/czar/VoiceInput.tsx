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

// How long of silence (ms) before auto-stopping after the user pauses
const SILENCE_TIMEOUT_MS = 2500;

export function VoiceInput({ onTranscript, onInterim, disabled = false }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported] = useState(() => getSpeechRecognitionCtor() !== null);
  const [showTooltip, setShowTooltip] = useState(false);
  const recognitionRef = useRef<AnySpeechRecognition>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accTextRef = useRef("");  // accumulated final transcript across continuous segments

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback((emitTranscript = false) => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    if (emitTranscript && accTextRef.current.trim()) {
      onTranscript(accTextRef.current.trim());
    }
    accTextRef.current = "";
    setIsRecording(false);
    if (onInterim) onInterim("");
  }, [clearSilenceTimer, onTranscript, onInterim]);

  const startRecognition = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) return;

    accTextRef.current = "";
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;   // keep listening across natural pauses
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => { setIsRecording(true); };

    recognition.onresult = (event: AnySpeechRecognition) => {
      let interimText = "";
      let newFinal = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          newFinal += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (newFinal) {
        accTextRef.current += (accTextRef.current ? " " : "") + newFinal.trim();
      }

      // Show everything so far (confirmed + live interim) as the preview
      if (onInterim) {
        const preview = accTextRef.current + (interimText ? (accTextRef.current ? " " : "") + interimText : "");
        onInterim(preview);
      }

      // Reset silence timer on every speech event
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        stopRecognition(true);
      }, SILENCE_TIMEOUT_MS);
    };

    recognition.onerror = (event: AnySpeechRecognition) => {
      // "no-speech" is not a real error — just no input detected yet; keep going
      if (event.error === "no-speech") return;
      console.error("[VoiceInput] Speech recognition error:", event.error);
      stopRecognition(false);
    };

    recognition.onend = () => {
      // onend fires when recognition stops (manually or browser auto-stop)
      // If we still have accumulated text and it wasn't emitted yet, emit it
      if (accTextRef.current.trim()) {
        onTranscript(accTextRef.current.trim());
        accTextRef.current = "";
      }
      clearSilenceTimer();
      setIsRecording(false);
      recognitionRef.current = null;
      if (onInterim) onInterim("");
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error("[VoiceInput] Failed to start recognition:", err);
      stopRecognition(false);
    }
  }, [onTranscript, onInterim, clearSilenceTimer, stopRecognition]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (isRecording) {
      stopRecognition(true);  // emit whatever was accumulated when user manually stops
    } else {
      startRecognition();
    }
  }, [disabled, isRecording, stopRecognition, startRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopRecognition(false); };
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
