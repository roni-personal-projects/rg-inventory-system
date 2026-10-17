'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { pickBestAlternative, correctSpokenProduct, getGiftSuggestions } from '@/lib/speechCorrection';

// SpeechRecognition type definitions
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export type VoiceState = 'idle' | 'starting' | 'listening' | 'recognizing' | 'error';

export function useVoiceInput(options?: {
  lang?: string;
  onResult?: (text: string, suggestions?: string[]) => void;
  continuous?: boolean;
}) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedLang, setSelectedLang] = useState<string>(options?.lang || 'en-IN');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(options?.onResult);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;
    console.log(`[VoiceInput] ${entry}`);
    setDebugLogs((prev) => [...prev.slice(-15), entry]);
  };

  useEffect(() => {
    onResultRef.current = options?.onResult;
  }, [options?.onResult]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as IWindow;
      const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      const supported = Boolean(SpeechClass);
      setIsSupported(supported);
      if (!supported) {
        addLog('Web Speech API not supported in this browser.');
      } else {
        addLog(`Web Speech API found: ${win.SpeechRecognition ? 'SpeechRecognition' : 'webkitSpeechRecognition'}`);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    addLog('Stopping voice recognition...');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err: any) {
        addLog(`Stop error (ignored): ${err.message}`);
      }
      recognitionRef.current = null;
    }
    setState('idle');
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    setRawTranscript('');
    setSuggestions([]);

    if (typeof window === 'undefined') return;

    const win = window as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      const err = 'Voice recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or type manually.';
      setError(err);
      setState('error');
      addLog(err);
      return;
    }

    // Abort any existing instance cleanly
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      setState('starting');
      addLog(`Initializing SpeechRecognition with lang: ${selectedLang}`);

      const recognition = new SpeechRecognitionClass();
      recognition.lang = selectedLang;
      recognition.continuous = Boolean(options?.continuous);
      recognition.interimResults = true;
      recognition.maxAlternatives = 5; // Request multiple alternatives for post-processing

      recognition.onstart = () => {
        addLog('Microphone is listening...');
        setState('listening');
        setError(null);
      };

      recognition.onaudiostart = () => {
        addLog('Audio hardware captured.');
      };

      recognition.onsoundstart = () => {
        addLog('Sound detected.');
      };

      recognition.onspeechstart = () => {
        addLog('Human speech detected.');
        setState('recognizing');
      };

      recognition.onspeechend = () => {
        addLog('Speech ended.');
      };

      recognition.onresult = (event: any) => {
        const alternatives: string[] = [];

        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          for (let a = 0; a < result.length; a++) {
            if (result[a]?.transcript) {
              alternatives.push(result[a].transcript);
            }
          }
        }

        const rawSpoken = event.results[event.results.length - 1]?.[0]?.transcript || '';
        setRawTranscript(rawSpoken);

        // Apply domain gift vocabulary post-processing & alternative scoring
        const corrected = pickBestAlternative(alternatives.length > 0 ? alternatives : [rawSpoken]);
        const newSuggestions = getGiftSuggestions(corrected);

        addLog(`Raw: "${rawSpoken}" -> Corrected: "${corrected}"`);

        if (corrected) {
          setTranscript(corrected);
          setSuggestions(newSuggestions);
          if (onResultRef.current) {
            onResultRef.current(corrected, newSuggestions);
          }
        }
      };

      recognition.onerror = (event: any) => {
        const errType = event.error;
        addLog(`Error event: ${errType}`);
        setState('error');

        switch (errType) {
          case 'not-allowed':
          case 'service-not-allowed':
            setError('Microphone permission denied. Please click the lock or camera/mic icon in the browser address bar and set Microphone to "Allow".');
            break;
          case 'no-speech':
            setError('No speech was detected before timeout. Please tap Speak and talk immediately.');
            break;
          case 'network':
            setError('Speech network error. Chrome requires internet access for Google Speech Recognition. If offline or on a VPN, please switch language to "en-US" or type manually.');
            break;
          case 'audio-capture':
            setError('No microphone hardware detected. Please plug in a microphone or check Windows Microphone settings.');
            break;
          case 'aborted':
            addLog('Session aborted.');
            setState('idle');
            return;
          default:
            setError(`Speech recognition error (${errType}). You can continue by typing.`);
            break;
        }
      };

      recognition.onend = () => {
        addLog('Speech recognition ended.');
        setState('idle');
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
      addLog('Called recognition.start()');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not start speech recognition';
      addLog(`Exception: ${msg}`);
      setState('error');
      setError(msg);
    }
  }, [selectedLang, options?.continuous]);

  return {
    isSupported,
    isListening: state === 'listening' || state === 'recognizing' || state === 'starting',
    state,
    transcript,
    rawTranscript,
    suggestions,
    error,
    selectedLang,
    setSelectedLang,
    debugLogs,
    startListening,
    stopListening,
    clearError: () => setError(null),
    clearLogs: () => setDebugLogs([]),
  };
}
