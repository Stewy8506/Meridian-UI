"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          onTranscript(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onTranscript]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsRecording(true);
        } catch (e) {
          console.error("Failed to start recording:", e);
        }
      } else {
        alert("Speech recognition is not supported in this browser.");
      }
    }
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-full h-9 w-9 shrink-0 transition-colors ${isRecording ? "text-red-500 bg-red-500/10 hover:text-red-600 hover:bg-red-500/20" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
      disabled={disabled && !isRecording}
      onClick={toggleRecording}
      type="button"
      title={isRecording ? "Stop recording" : "Start voice input"}
    >
      {isRecording ? (
        <Square className="h-5 w-5 fill-current" strokeWidth={1.5} />
      ) : (
        <Mic className="h-5 w-5" strokeWidth={1.5} />
      )}
    </button>
  );
}
