import { useState, useRef } from "react";

export const useVoiceCommand = (onCommand: (intent: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.onresult = (e: any) => {
      const t = e.results[0][0].transcript.toLowerCase();
      if (t.includes("format like sample")) onCommand("apply_sample_style");
      else if (t.includes("fix") || t.includes("correct")) onCommand("correct");
      else onCommand("chat");
      setIsListening(false);
    };
    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.start();
    setIsListening(true);
  };

  return { isListening, startListening };
};
