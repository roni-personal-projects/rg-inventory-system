'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// SpeechRecognition type definitions
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function useVoiceInput(options?: {
  lang?: string;
  onResult?: (text: string) => void;
  continuous?: boolean;
}) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const lang = options?.lang || 'en-IN'; // Indian English handles Indian gift names well
  const onResultCallback = options?.onResult;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as IWindow;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechRecognition));
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
      setIsListening(false);
    }
  }, [isListening]);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');

    if (typeof window === 'undefined') return;

    const win = window as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Please type manually.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = Boolean(options?.continuous);
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        currentTranscript = currentTranscript.trim();
        setTranscript(currentTranscript);

        if (onResultCallback && currentTranscript) {
          onResultCallback(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError('Microphone permission was denied. Please allow microphone access or type manually.');
        } else if (event.error === 'no-speech') {
          setError('No speech was detected. Please tap Speak and try again.');
        } else if (event.error === 'network') {
          setError('Network issue with speech service. Please type manually.');
        } else {
          setError(`Voice input error: ${event.error}. You can continue by typing.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      setIsListening(false);
      setError('Could not start voice recognition. Please type manually.');
    }
  }, [lang, options?.continuous, onResultCallback]);

  return {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearError: () => setError(null),
  };
}
