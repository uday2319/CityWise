import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftRight,
  Copy,
  Info,
  Loader2,
  Maximize2,
  Mic,
  Minimize2,
  Pause,
  Play,
  Search,
  Send,
  Square,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { apiErrorMessage, itineraApi } from '../api/itineraApi';
import { useProfile } from '../context/ProfileContext';
import { useTranslator } from '../context/TranslatorContext';
import { LANGUAGES, languageByCode, PHRASE_GROUPS } from '../lib/languages';
import {
  recognitionConstructor,
  useSpeechRecognition,
  useSpeechSynthesis,
} from '../lib/speech';
import { ErrorNotice } from './ui';

type Synthesis = ReturnType<typeof useSpeechSynthesis>;
type Mode = 'translate' | 'conversation' | 'phrases';
type Side = 'a' | 'b';

const MAX_LENGTH = 500;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  } catch {
    toast.error('Could not copy. Select the text and copy it instead.');
  }
}

function PlayButton({
  id,
  text,
  code,
  synthesis,
}: {
  id: string;
  text: string;
  code: string;
  synthesis: Synthesis;
}) {
  const language = languageByCode(code);
  const playing = synthesis.speakingId === id;

  return (
    <button
      type="button"
      onClick={() =>
        playing ? synthesis.stop() : synthesis.speak(text, language.speech, language.name, id)
      }
      aria-label={playing ? 'Stop playback' : `Speak translation in ${language.name}`}
      title={playing ? 'Stop' : 'Speak'}
      className="icon-btn h-9 w-9 bg-white text-forest-800 shadow-soft hover:bg-forest-50"
    >
      {playing ? <Square size={15} /> : <Volume2 size={17} />}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => copyText(text)}
      aria-label="Copy translation"
      title="Copy"
      className="icon-btn h-9 w-9 bg-white text-forest-800 shadow-soft hover:bg-forest-50"
    >
      <Copy size={16} />
    </button>
  );
}

function Listening() {
  return (
    <span className="flex h-5 items-end gap-0.5" aria-hidden="true">
      {[0, 1, 2, 3, 4].map(bar => (
        <span
          key={bar}
          className="listening-bar w-1 rounded-full bg-teal-500"
          style={{ animationDelay: `${bar * 110}ms` }}
        />
      ))}
    </span>
  );
}

// ── Translate ───────────────────────────────────────────────────────────────

interface Outcome {
  original: string;
  translated: string;
  warning: string | null;
  to: string;
}

function TranslateMode({
  source,
  target,
  synthesis,
}: {
  source: string;
  target: string;
  synthesis: Synthesis;
}) {
  const speech = useSpeechRecognition();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const translate = async (input: string) => {
    const clean = input.trim();
    if (!clean) return;
    if (source === target) {
      setError('Choose two different languages.');
      return;
    }
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      const result = await itineraApi.translate(clean, source, target);
      setOutcome({
        original: clean,
        translated: result.translated_text,
        warning: result.warning,
        to: target,
      });
    } catch (failure) {
      setError(apiErrorMessage(failure, 'The translation failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const listen = () =>
    speech.start(languageByCode(source).speech, heard => {
      setText(heard);
      translate(heard);
    });

  const sourceName = languageByCode(source).name;
  const targetName = languageByCode(target).name;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 min-[400px]:grid-cols-2">
        <div className="flex min-h-[190px] flex-col rounded-2xl border border-line bg-white p-3">
          <label htmlFor="translator-input" className="mb-1 text-xs font-bold text-forest-500">
            {sourceName}
          </label>
          <textarea
            id="translator-input"
            rows={5}
            maxLength={MAX_LENGTH}
            value={speech.listening ? speech.transcript : text}
            readOnly={speech.listening}
            onChange={event => setText(event.target.value)}
            placeholder={speech.listening ? 'Listening…' : 'Speak, or type here'}
            className="w-full flex-1 resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-ink placeholder-ink-mute focus:outline-none focus:ring-0"
          />
          <div className="mt-1 flex items-center justify-between">
            <button
              type="button"
              disabled={!text}
              onClick={() => {
                setText('');
                setOutcome(null);
                setError(null);
              }}
              aria-label="Clear text"
              className="icon-btn h-8 w-8 text-ink-mute hover:bg-forest-50"
            >
              <X size={15} />
            </button>
            <button
              type="button"
              disabled={busy || !text.trim()}
              onClick={() => translate(text)}
              className="btn-primary px-3 py-1.5"
            >
              Translate
            </button>
          </div>
        </div>

        <section
          aria-label="Translation"
          aria-live="polite"
          className="flex min-h-[190px] flex-col rounded-2xl bg-forest-50 p-3"
        >
          <p className="mb-1 text-xs font-bold text-forest-500">{targetName}</p>
          <div className="flex-1 text-[15px] leading-relaxed">
            {busy && (
              <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
                <Loader2 size={15} className="animate-spin" /> Translating
              </span>
            )}
            {!busy && outcome && (
              <p lang={outcome.to} className="text-lg font-bold leading-snug">
                {outcome.translated}
              </p>
            )}
            {!busy && !outcome && (
              <span className="text-sm text-ink-soft">Your translation appears here</span>
            )}
          </div>
          {outcome && (
            <div className="mt-1 flex items-center justify-end gap-2">
              <PlayButton id="translate" text={outcome.translated} code={outcome.to} synthesis={synthesis} />
              <CopyButton text={outcome.translated} />
            </div>
          )}
        </section>
      </div>

      {outcome?.warning && (
        <p className="text-sm font-medium text-ember-700">{outcome.warning}</p>
      )}

      <div className="flex flex-col items-center gap-2 py-2">
        <button
          type="button"
          disabled={!speech.supported}
          onClick={speech.listening ? speech.stop : listen}
          aria-pressed={speech.listening}
          aria-label={speech.listening ? 'Stop recording' : `Speak in ${sourceName}`}
          className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lift transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            speech.listening ? 'bg-red-700' : 'bg-forest-800 hover:bg-forest-700'
          }`}
        >
          {speech.listening ? <Square size={26} /> : <Mic size={32} />}
        </button>
        <span className="flex h-5 items-center gap-2 text-sm font-medium text-ink-soft" aria-live="polite">
          {speech.listening ? <><Listening /> Listening. Tap to stop.</> : 'Tap to speak'}
        </span>
      </div>

      {speech.error && <ErrorNotice>{speech.error}</ErrorNotice>}
      {error && <ErrorNotice>{error}</ErrorNotice>}
    </div>
  );
}

// ── Conversation ────────────────────────────────────────────────────────────

interface Turn {
  id: string;
  side: Side;
  original: string;
  translated: string | null;
  warning: string | null;
  error: string | null;
  from: string;
  to: string;
}

type Session = 'idle' | 'running' | 'paused';

function ConversationMode({
  source,
  target,
  synthesis,
}: {
  source: string;
  target: string;
  synthesis: Synthesis;
}) {
  const speech = useSpeechRecognition();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [session, setSession] = useState<Session>('idle');
  const [speaker, setSpeaker] = useState<Side>('a');
  const [draft, setDraft] = useState({ a: '', b: '' });
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef<Session>('idle');
  const end = useRef<HTMLLIElement>(null);

  const changeSession = (next: Session) => {
    sessionRef.current = next;
    setSession(next);
  };

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [turns]);

  const languageOf = (side: Side) => languageByCode(side === 'a' ? source : target);

  const say = async (side: Side, input: string) => {
    const original = input.trim();
    if (!original) return;
    const from = languageOf(side);
    const to = languageOf(side === 'a' ? 'b' : 'a');
    const id = crypto.randomUUID();
    const next: Side = side === 'a' ? 'b' : 'a';

    setTurns(all => [...all, {
      id, side, original, translated: null, warning: null, error: null,
      from: from.code, to: to.code,
    }]);
    setBusy(true);

    const continueSession = () => {
      setSpeaker(next);
      if (sessionRef.current === 'running') listen(next);
    };

    try {
      const result = await itineraApi.translate(original, from.code, to.code);
      setTurns(all => all.map(turn =>
        turn.id === id
          ? { ...turn, translated: result.translated_text, warning: result.warning }
          : turn
      ));
      const speaking = synthesis.speak(
        result.translated_text, to.speech, to.name, id, continueSession
      );
      if (!speaking) continueSession();
    } catch (failure) {
      const message = apiErrorMessage(failure, 'The translation failed.');
      setTurns(all => all.map(turn => (turn.id === id ? { ...turn, error: message } : turn)));
      if (sessionRef.current === 'running') changeSession('paused');
    } finally {
      setBusy(false);
    }
  };

  const listen = (side: Side) => {
    setSpeaker(side);
    speech.start(languageOf(side).speech, heard => say(side, heard), () => {
      if (sessionRef.current === 'running') changeSession('paused');
    });
  };

  const start = () => {
    changeSession('running');
    listen(speaker);
  };

  const pause = () => {
    changeSession('paused');
    speech.cancel();
    synthesis.stop();
  };

  const stop = () => {
    changeSession('idle');
    speech.cancel();
    synthesis.stop();
    setSpeaker('a');
  };

  const sendDraft = (side: Side) => {
    say(side, draft[side]);
    setDraft(all => ({ ...all, [side]: '' }));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {session === 'idle' && (
          <button type="button" disabled={!speech.supported} onClick={start} className="btn-primary">
            <Play size={15} /> Start
          </button>
        )}
        {session === 'running' && (
          <button type="button" onClick={pause} className="btn-secondary">
            <Pause size={15} /> Pause
          </button>
        )}
        {session === 'paused' && (
          <button type="button" onClick={start} className="btn-primary">
            <Play size={15} /> Resume
          </button>
        )}
        {session !== 'idle' && (
          <button type="button" onClick={stop} className="btn-secondary">
            <Square size={14} /> Stop
          </button>
        )}
        <button
          type="button"
          disabled={turns.length === 0}
          onClick={() => setTurns([])}
          className="btn-ghost ml-auto px-3 py-2"
        >
          <Trash2 size={15} /> Clear
        </button>
      </div>

      <p className="flex h-5 items-center gap-2 text-sm font-medium text-ink-soft" aria-live="polite">
        {speech.listening && (
          <><Listening /> Person {speaker.toUpperCase()}, speak in {languageOf(speaker).name}</>
        )}
        {!speech.listening && session === 'paused' && 'Paused'}
        {!speech.listening && session === 'running' && 'Translating and playing'}
        {!speech.listening && session === 'idle' && 'Press Start, then take turns speaking'}
      </p>

      <ol className="max-h-[42vh] min-h-[220px] space-y-2.5 overflow-y-auto rounded-2xl border border-line bg-canvas p-3">
        {turns.length === 0 && (
          <li className="py-12 text-center text-sm text-ink-soft">
            Each message is translated and read aloud for the other person.
          </li>
        )}
        {turns.map(turn => (
          <li key={turn.id} className={`flex ${turn.side === 'a' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[88%] rounded-2xl p-3 shadow-soft ${
              turn.side === 'a' ? 'rounded-bl-md bg-white' : 'rounded-br-md bg-forest-50'
            }`}>
              <p className="text-xs font-bold text-forest-500">
                Person {turn.side.toUpperCase()} · {languageByCode(turn.from).name}
              </p>
              <p className="text-sm text-ink-soft">{turn.original}</p>
              {turn.translated && (
                <div className="mt-1 flex items-start gap-2">
                  <p lang={turn.to} className="flex-1 text-base font-bold leading-snug">
                    {turn.translated}
                  </p>
                  <PlayButton id={turn.id} text={turn.translated} code={turn.to} synthesis={synthesis} />
                </div>
              )}
              {turn.warning && <p className="text-xs font-medium text-ember-700">{turn.warning}</p>}
              {!turn.translated && !turn.error && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                  <Loader2 size={14} className="animate-spin" /> Translating
                </p>
              )}
              {turn.error && <p className="mt-1 text-sm font-medium text-red-800">{turn.error}</p>}
            </div>
          </li>
        ))}
        <li ref={end} aria-hidden="true" />
      </ol>

      {speech.error && <ErrorNotice>{speech.error}</ErrorNotice>}

      <div className="grid gap-2">
        {(['a', 'b'] as Side[]).map(side => {
          const language = languageOf(side);
          const active = speech.listening && speaker === side;
          return (
            <form
              key={side}
              onSubmit={event => {
                event.preventDefault();
                sendDraft(side);
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                disabled={!speech.supported || (speech.listening && !active) || session === 'running'}
                onClick={active ? speech.stop : () => listen(side)}
                aria-pressed={active}
                aria-label={active ? 'Stop recording' : `Person ${side.toUpperCase()}: speak in ${language.name}`}
                className={`icon-btn h-11 w-11 text-white disabled:opacity-40 ${
                  active ? 'bg-red-700' : side === 'a' ? 'bg-forest-800' : 'bg-teal-700'
                }`}
              >
                {active ? <Square size={16} /> : <Mic size={19} />}
              </button>
              <input
                className="input"
                value={active ? speech.transcript : draft[side]}
                readOnly={active}
                maxLength={MAX_LENGTH}
                onChange={event => setDraft(all => ({ ...all, [side]: event.target.value }))}
                placeholder={`Person ${side.toUpperCase()} (${language.name})`}
                aria-label={`Message from person ${side.toUpperCase()} in ${language.name}`}
              />
              <button
                type="submit"
                disabled={busy || !draft[side].trim()}
                aria-label={`Send message from person ${side.toUpperCase()}`}
                className="icon-btn h-11 w-11 bg-forest-50 text-forest-800 hover:bg-forest-100"
              >
                <Send size={17} />
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}

// ── Quick phrases ───────────────────────────────────────────────────────────

function PhrasesMode({
  source,
  target,
  synthesis,
}: {
  source: string;
  target: string;
  synthesis: Synthesis;
}) {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ text: string; code: string } | null>(null);

  // Phrases are written in English, so show them in a non-English language.
  const output = target === 'en' ? source : target;

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    return PHRASE_GROUPS
      .map(group => ({
        ...group,
        phrases: group.phrases.filter(phrase => phrase.toLowerCase().includes(term)),
      }))
      .filter(group => group.phrases.length > 0);
  }, [search]);

  const choose = async (phrase: string) => {
    setActive(phrase);
    setResult(null);
    setError(null);
    if (output === 'en') {
      setError('Choose a language other than English.');
      return;
    }
    setBusy(true);
    try {
      const translation = await itineraApi.translate(phrase, 'en', output);
      setResult({ text: translation.translated_text, code: output });
    } catch (failure) {
      setError(apiErrorMessage(failure, 'The translation failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search phrases"
          aria-label="Search travel phrases"
          className="input pl-9"
        />
      </div>

      {groups.length === 0 && (
        <p className="py-6 text-center text-sm text-ink-soft">No phrases match your search.</p>
      )}

      <div className="max-h-[62vh] space-y-4 overflow-y-auto pr-1">
        {groups.map(group => (
          <section key={group.title}>
            <h3 className="eyebrow mb-1.5">{group.title}</h3>
            <ul className="space-y-1">
              {group.phrases.map(phrase => {
                const selected = active === phrase;
                return (
                  <li key={phrase} className={`rounded-xl ${selected ? 'bg-forest-50' : ''}`}>
                    <button
                      type="button"
                      aria-expanded={selected}
                      onClick={() => choose(phrase)}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-forest-50"
                    >
                      {phrase}
                    </button>
                    {selected && (
                      <div className="px-3 pb-3" aria-live="polite">
                        {busy && (
                          <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
                            <Loader2 size={14} className="animate-spin" /> Translating
                          </span>
                        )}
                        {error && <ErrorNotice>{error}</ErrorNotice>}
                        {result && (
                          <div className="flex items-start gap-2">
                            <p lang={result.code} className="flex-1 text-lg font-bold leading-snug">
                              {result.text}
                            </p>
                            <PlayButton id={phrase} text={result.text} code={result.code} synthesis={synthesis} />
                            <CopyButton text={result.text} />
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

// ── Panel ───────────────────────────────────────────────────────────────────

const MODES: { key: Mode; label: string }[] = [
  { key: 'translate', label: 'Translate' },
  { key: 'conversation', label: 'Conversation' },
  { key: 'phrases', label: 'Quick Phrases' },
];

export default function VoiceTranslator() {
  const { isOpen, closeTranslator } = useTranslator();
  const { profile } = useProfile();
  const synthesis = useSpeechSynthesis();
  const { stop: stopSpeech, clearError } = synthesis;

  const [source, setSource] = useState(profile.sourceLanguage);
  const [target, setTarget] = useState(profile.targetLanguage);
  const [mode, setMode] = useState<Mode>('translate');
  const [expanded, setExpanded] = useState(false);
  const [speechSupported] = useState(() => recognitionConstructor() !== null);
  const heading = useRef<HTMLHeadingElement>(null);

  const { data: provider } = useQuery({
    queryKey: ['translation-provider'],
    queryFn: itineraApi.getTranslationProvider,
    enabled: isOpen,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (isOpen) {
      heading.current?.focus();
      return;
    }
    stopSpeech();
  }, [isOpen, stopSpeech]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeTranslator();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeTranslator]);

  const swap = () => {
    setSource(target);
    setTarget(source);
  };

  const targetVoiceMissing =
    synthesis.supported && !synthesis.voiceFor(languageByCode(target).speech);

  return (
    <aside
      aria-label="Voice Translator"
      inert={!isOpen}
      className={`fixed inset-y-0 right-0 z-[1250] flex w-full flex-col bg-white shadow-lift transition-transform duration-200 ${
        expanded ? 'sm:w-[720px]' : 'sm:w-[460px]'
      } ${isOpen ? 'translate-x-0' : 'invisible translate-x-full'}`}
    >
      <header className="flex items-center gap-2 border-b border-line px-5 py-3.5">
        <Mic size={20} className="text-forest-800" />
        <h2 ref={heading} tabIndex={-1} className="flex-1 text-lg font-extrabold focus:outline-none">
          Voice Translator
        </h2>
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          aria-label={expanded ? 'Make panel narrower' : 'Make panel wider'}
          className="icon-btn hidden text-ink-soft hover:bg-forest-50 sm:inline-flex"
        >
          {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
        <button
          type="button"
          onClick={closeTranslator}
          aria-label="Close Voice Translator"
          className="icon-btn text-ink-soft hover:bg-forest-50"
        >
          <X size={19} />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div role="tablist" aria-label="Translator mode" className="grid grid-cols-3 gap-1 rounded-xl bg-canvas p-1">
          {MODES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              onClick={() => {
                synthesis.stop();
                clearError();
                setMode(key);
              }}
              className={`rounded-lg px-1 py-2 text-sm font-semibold transition-colors ${
                mode === key ? 'bg-forest-800 text-white' : 'text-ink-soft hover:bg-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="translator-source" className="mb-1 block text-xs font-bold text-ink-soft">From</label>
            <select id="translator-source" className="input font-semibold" value={source} onChange={e => setSource(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={swap}
            aria-label="Swap languages"
            className="icon-btn h-[42px] w-[42px] border border-line bg-white hover:bg-forest-50"
          >
            <ArrowLeftRight size={17} />
          </button>
          <div className="min-w-0 flex-1">
            <label htmlFor="translator-target" className="mb-1 block text-xs font-bold text-ink-soft">To</label>
            <select id="translator-target" className="input font-semibold" value={target} onChange={e => setTarget(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        </div>

        {source === target && <ErrorNotice>Choose two different languages.</ErrorNotice>}
        {!speechSupported && (
          <ErrorNotice>
            This browser does not support speech input. Typing still works, or use Chrome or Edge for the microphone.
          </ErrorNotice>
        )}
        {synthesis.error && <ErrorNotice>{synthesis.error}</ErrorNotice>}

        <div hidden={mode !== 'translate'}>
          <TranslateMode source={source} target={target} synthesis={synthesis} />
        </div>
        <div hidden={mode !== 'conversation'}>
          <ConversationMode source={source} target={target} synthesis={synthesis} />
        </div>
        <div hidden={mode !== 'phrases'}>
          <PhrasesMode source={source} target={target} synthesis={synthesis} />
        </div>
      </div>

      <footer className="space-y-1 border-t border-line px-5 py-2.5 text-xs text-ink-soft">
        {targetVoiceMissing && !synthesis.error && (
          <p className="flex items-start gap-1.5">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            No {languageByCode(target).name} voice on this device, so translations show as text.
          </p>
        )}
        {provider === 'mymemory' && (
          <p className="flex items-start gap-1.5">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            Free machine translation can be wrong. Don’t rely on it alone in an emergency.
          </p>
        )}
      </footer>
    </aside>
  );
}
