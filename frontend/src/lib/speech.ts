import { useCallback, useEffect, useRef, useState } from 'react';

// SpeechRecognition is not in TypeScript's DOM types.
interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionConstructor = new () => Recognition;

export function recognitionConstructor(): RecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const RECOGNITION_ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow it in your browser’s site settings, then try again.',
  'service-not-allowed': 'Speech recognition is not allowed in this browser. You can type instead.',
  'audio-capture': 'No microphone was found. Connect one, or type instead.',
  'no-speech': 'No speech was heard. Please try again.',
  network: 'Speech recognition could not reach its online service. You can type instead.',
  'language-not-supported': 'This browser cannot recognise speech in this language. You can type instead.',
};

export function useSpeechRecognition() {
  const [supported] = useState(() => recognitionConstructor() !== null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const active = useRef<Recognition | null>(null);

  useEffect(() => () => active.current?.abort(), []);

  const start = useCallback((lang: string, onResult: (text: string) => void) => {
    const Constructor = recognitionConstructor();
    if (!Constructor) return;

    active.current?.abort();
    const recognition = new Constructor();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let heard = '';
    let failed = false;

    recognition.onresult = event => {
      heard = Array.from(event.results)
        .map(result => result[0].transcript)
        .join(' ')
        .trim();
      setTranscript(heard);
    };

    recognition.onerror = event => {
      if (event.error === 'aborted') return;
      failed = true;
      setError(
        RECOGNITION_ERRORS[event.error] ?? 'Speech recognition failed. You can type instead.'
      );
    };

    recognition.onend = () => {
      setListening(false);
      setTranscript('');
      active.current = null;
      if (heard && !failed) onResult(heard);
      else if (!failed) setError(RECOGNITION_ERRORS['no-speech']);
    };

    setError(null);
    setTranscript('');
    setListening(true);
    active.current = recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
      setError('Speech recognition could not start. Please try again.');
    }
  }, []);

  const stop = useCallback(() => active.current?.stop(), []);
  const clearError = useCallback(() => setError(null), []);

  return { supported, listening, transcript, error, start, stop, clearError };
}

export function useSpeechSynthesis() {
  const [supported] = useState(() => 'speechSynthesis' in window);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Browsers can drop an utterance that is garbage collected mid-speech.
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const voiceFor = useCallback(
    (lang: string) => {
      const prefix = lang.split('-')[0].toLowerCase();
      return (
        voices.find(voice => voice.lang.toLowerCase() === lang.toLowerCase()) ??
        voices.find(voice => voice.lang.toLowerCase().startsWith(prefix)) ??
        null
      );
    },
    [voices]
  );

  /** Returns whether speech started; failures are reported through `error`. */
  const speak = useCallback(
    (text: string, lang: string, languageName: string, id: string): boolean => {
      if (!supported) {
        setError('This browser cannot play speech.');
        return false;
      }
      const voice = voiceFor(lang);
      if (!voice) {
        setError(
          `No ${languageName} voice is installed on this device, so this can’t be read aloud. You can show the text instead.`
        );
        return false;
      }

      window.speechSynthesis.cancel();
      const next = new SpeechSynthesisUtterance(text);
      next.lang = voice.lang;
      next.voice = voice;
      next.onend = () => setSpeakingId(null);
      next.onerror = event => {
        setSpeakingId(null);
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          setError('Playback failed. Please try again.');
        }
      };

      utterance.current = next;
      setError(null);
      setSpeakingId(id);
      window.speechSynthesis.speak(next);
      return true;
    },
    [supported, voiceFor]
  );

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [supported]);

  const clearError = useCallback(() => setError(null), []);

  return { supported, speakingId, error, speak, stop, voiceFor, clearError };
}
