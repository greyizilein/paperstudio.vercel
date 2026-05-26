import { useState, useRef } from "react";

export function useVoiceCommand(onCommand: (intent: string, payload?: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("[useVoiceCommand] Speech recognition not supported in this browser.");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      if (transcript.includes("fix") || transcript.includes("correct")) {
        onCommand("correct");
      } else if (transcript.includes("write more") || transcript.includes("continue writing") || transcript.includes("write")) {
        onCommand("write");
      } else {
        onCommand("chat", transcript);
      }
      setIsListening(false);
    };

    recognitionRef.current.onerror = () => { setIsListening(false); };
    recognitionRef.current.onend = () => { setIsListening(false); };

    recognitionRef.current.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return { isListening, startListening, stopListening };
}
