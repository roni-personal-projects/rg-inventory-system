'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  pickBestAlternative,
  correctSpokenProduct,
  getGiftSuggestions,
  assembleTranscript,
  cleanSpokenDuplicates,
} from '@/lib/speechCorrection';

// SpeechRecognition type definitions
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export type VoiceState = 'idle' | 'starting' | 'listening' | 'recognizing' | 'error';

export function useVoiceInput(options?: {
  lang?: string;
  onResult?: (text: string, suggestions?: string[]) => void;
  onFinalPhrase?: (phrase: string) => void;
  continuous?: boolean;
  pauseThresholdMs?: number; // silence threshold to commit an item in continuous mode (default: 950ms)
}) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isInsecureOrigin, setIsInsecureOrigin] = useState<boolean>(false);
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedLang, setSelectedLang] = useState<string>(options?.lang || 'en-IN');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Pause Detection State for visual progress feedback
  const [isPausing, setIsPausing] = useState<boolean>(false);
  const [pauseProgress, setPauseProgress] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(options?.onResult);
  const onFinalPhraseRef = useRef(options?.onFinalPhrase);
  const isListeningRequestedRef = useRef<boolean>(false);
  const isCyclingRef = useRef<boolean>(false);
  const uncommittedBufferRef = useRef<string>('');
  const pauseTimerRef = useRef<any>(null);
  const pauseIntervalRef = useRef<any>(null);
  const pauseThresholdRef = useRef<number>(options?.pauseThresholdMs ?? 1000);

  useEffect(() => {
    if (options?.pauseThresholdMs !== undefined) {
      pauseThresholdRef.current = options.pauseThresholdMs;
    }
  }, [options?.pauseThresholdMs]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;
    console.log(`[VoiceInput] ${entry}`);
    setDebugLogs((prev) => [...prev.slice(-15), entry]);
  };

  useEffect(() => {
    onResultRef.current = options?.onResult;
    onFinalPhraseRef.current = options?.onFinalPhrase;
  }, [options?.onResult, options?.onFinalPhrase]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      const isSecure =
        window.isSecureContext ||
        window.location.protocol === 'https:' ||
        isLocalhost;

      if (!isSecure) {
        setIsInsecureOrigin(true);
      }

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

  const clearPauseTimers = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (pauseIntervalRef.current) {
      clearInterval(pauseIntervalRef.current);
      pauseIntervalRef.current = null;
    }
    setIsPausing(false);
    setPauseProgress(0);
  }, []);

  const commitBuffer = useCallback((forcedText?: string) => {
    clearPauseTimers();
    const textToCommit = (forcedText || uncommittedBufferRef.current).trim();
    if (textToCommit && textToCommit.length > 1) {
      addLog(`[Item Committed via Pause/Next]: "${textToCommit}"`);
      if (onFinalPhraseRef.current) {
        onFinalPhraseRef.current(textToCommit);
      }
    }
    uncommittedBufferRef.current = '';
    setInterimTranscript('');
  }, [clearPauseTimers]);

  // Starts or restarts an active speech recognition session
  const startRecognitionSession = useCallback(() => {
    if (typeof window === 'undefined') return;

    const win = window as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    // Clean up existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = selectedLang;
      recognition.continuous = Boolean(options?.continuous);
      recognition.interimResults = true;
      recognition.maxAlternatives = 5;

      recognition.onstart = () => {
        addLog('Microphone is listening...');
        setState('listening');
        setError(null);
      };

      recognition.onspeechstart = () => {
        addLog('Speech detected...');
        setState('recognizing');
      };

      recognition.onresult = (event: any) => {
        if (isCyclingRef.current) {
          return;
        }

        const chunks: string[] = [];
        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res && res[0] && res[0].transcript) {
            chunks.push(res[0].transcript);
          }
        }

        const rawAssembled = assembleTranscript(chunks);
        const currentText = cleanSpokenDuplicates(rawAssembled);
        if (!currentText) return;

        uncommittedBufferRef.current = currentText;
        setInterimTranscript(currentText);
        setRawTranscript(currentText);

        if (options?.continuous) {
          // Reset pause timers on every incoming sound/interim change
          clearPauseTimers();

          // Check if speech contains an explicit separator keyword at the end
          // e.g. "Brass Ganesh 6 inch next" or "Ganesh murti and"
          const separatorMatch = currentText.match(/(.+?)\s+(?:next|agla|aur|and|comma)\s*$/i);
          if (separatorMatch && separatorMatch[1].trim().length > 1) {
            const itemText = separatorMatch[1].trim();
            addLog(`Separator command detected: committing "${itemText}"`);
            isCyclingRef.current = true;
            commitBuffer(itemText);
            try { recognition.stop(); } catch {}
            return;
          }

          // Start active silence / pause countdown
          setIsPausing(true);
          const currentThreshold = pauseThresholdRef.current;
          const startTime = Date.now();

          pauseIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(100, Math.round((elapsed / currentThreshold) * 100));
            setPauseProgress(pct);
          }, 30);

          pauseTimerRef.current = setTimeout(() => {
            clearPauseTimers();
            const pending = uncommittedBufferRef.current.trim();
            if (pending.length > 1) {
              addLog(`Pause threshold reached (${currentThreshold}ms). Committing item.`);
              isCyclingRef.current = true;
              commitBuffer(pending);

              // Stop current recognition so Chrome starts the next item with a clean buffer
              try {
                recognition.stop();
              } catch {}
            }
          }, currentThreshold);
        } else {
          // Single product mode
          const corrected = pickBestAlternative([currentText]);
          setTranscript(corrected);
          const newSuggestions = getGiftSuggestions(corrected);
          setSuggestions(newSuggestions);
          if (onResultRef.current && corrected) {
            onResultRef.current(corrected, newSuggestions);
          }
        }
      };

      recognition.onerror = (event: any) => {
        const errType = event.error;
        addLog(`Speech error event: ${errType}`);

        if (errType === 'no-speech') {
          // Expected during pauses between items, do not treat as fatal
          return;
        }

        if (errType === 'aborted') {
          return;
        }

        setState('error');
        switch (errType) {
          case 'not-allowed':
          case 'service-not-allowed':
            setError('Microphone permission denied. Please allow microphone access in your mobile browser address bar.');
            break;
          case 'network':
            setError('Speech network error. Chrome requires internet access for speech recognition. Try switching language to "en-US" or type manually.');
            break;
          default:
            setError(`Speech recognition notice (${errType}). You can also type or use sample items.`);
            break;
        }
      };

      recognition.onend = () => {
        addLog('Recognition session ended.');
        clearPauseTimers();
        isCyclingRef.current = false;

        // If continuous mode is active and user didn't request stop, auto-restart cleanly
        if (isListeningRequestedRef.current && options?.continuous) {
          addLog('Auto-restarting listener for next item...');
          setState('listening');
          setTimeout(() => {
            if (isListeningRequestedRef.current) {
              startRecognitionSession();
            }
          }, 120);
        } else {
          setState('idle');
          setInterimTranscript('');
          recognitionRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      addLog('Called recognition.start() successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not start speech recognition';
      addLog(`Exception in startRecognitionSession: ${msg}`);
      setState('error');
      setError(msg);
    }
  }, [options?.continuous, selectedLang, clearPauseTimers, commitBuffer]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setRawTranscript('');
    setSuggestions([]);
    uncommittedBufferRef.current = '';
    clearPauseTimers();

    if (typeof window === 'undefined') return;

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    const isSecure =
      window.isSecureContext ||
      window.location.protocol === 'https:' ||
      isLocalhost;

    if (!isSecure) {
      setIsInsecureOrigin(true);
      const err = `Microphone blocked: Mobile browsers require HTTPS or a 1-time Chrome flag on local IP (${window.location.origin}). Tap "Mobile Mic Setup" below to enable it.`;
      setError(err);
      setState('error');
      addLog(err);
      return;
    }

    // Actively prompt for microphone permission via getUserMedia
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      try {
        addLog('Requesting microphone permission from browser...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        addLog('Microphone permission granted by user.');
        stream.getTracks().forEach((track) => track.stop());
      } catch (micErr: any) {
        addLog(`getUserMedia permission error: ${micErr.name} - ${micErr.message}`);
        if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
          setError('Microphone permission was denied. Please allow microphone access in your mobile browser address bar.');
          setState('error');
          return;
        }
      }
    }

    const win = window as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      const err = 'Voice recognition is not supported in this browser. Please use Google Chrome or type manually.';
      setError(err);
      setState('error');
      addLog(err);
      return;
    }

    isListeningRequestedRef.current = true;
    setState('starting');
    startRecognitionSession();
  }, [clearPauseTimers, startRecognitionSession]);

  const stopListening = useCallback(() => {
    addLog('Stopping voice recognition...');
    isListeningRequestedRef.current = false;
    clearPauseTimers();

    // Commit any pending buffer before stopping
    if (uncommittedBufferRef.current.trim().length > 1) {
      commitBuffer();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err: any) {
        addLog(`Stop error (ignored): ${err.message}`);
      }
      recognitionRef.current = null;
    }
    setState('idle');
    setInterimTranscript('');
  }, [clearPauseTimers, commitBuffer]);

  // Manually force-commit whatever has been spoken right now without waiting for pause
  const forceCommitCurrentPhrase = useCallback(() => {
    clearPauseTimers();
    const pending = uncommittedBufferRef.current.trim();
    if (pending.length > 1) {
      isCyclingRef.current = true;
      commitBuffer(pending);
      try {
        recognitionRef.current?.stop();
      } catch {}
    }
  }, [clearPauseTimers, commitBuffer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRequestedRef.current = false;
      clearPauseTimers();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, [clearPauseTimers]);

  return {
    isSupported,
    isInsecureOrigin,
    isListening: state === 'listening' || state === 'recognizing' || state === 'starting',
    state,
    transcript,
    interimTranscript,
    rawTranscript,
    suggestions,
    error,
    selectedLang,
    setSelectedLang,
    debugLogs,
    isPausing,
    pauseProgress,
    startListening,
    stopListening,
    forceCommitCurrentPhrase,
    clearError: () => setError(null),
    clearLogs: () => setDebugLogs([]),
  };
}
