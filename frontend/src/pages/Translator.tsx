import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  Info,
  Languages,
  Loader2,
  MessagesSquare,
  Mic,
  Send,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react';
import { apiErrorMessage, itineraApi } from '../api/itineraApi';
import { ErrorNotice } from '../components/ui';
import { useProfile } from '../context/ProfileContext';
import { LANGUAGES, languageByCode, PHRASE_GROUPS } from '../lib/languages';
import {
  recognitionConstructor,
  useSpeechRecognition,
  useSpeechSynthesis,
} from '../lib/speech';
import type { TranslationResult } from '../types';

type Synthesis = ReturnType<typeof useSpeechSynthesis>;

const MAX_LENGTH = 500;

function LanguageSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} className="input" value={value} onChange={e => onChange(e.target.value)}>
        {LANGUAGES.map(language => (
          <option key={language.code} value={language.code}>{language.name}</option>
        ))}
      </select>
    </div>
  );
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
        playing
          ? synthesis.stop()
          : synthesis.speak(text, language.speech, language.name, id)
      }
      aria-label={playing ? 'Stop playback' : `Play in ${language.name}`}
      className="btn-secondary px-3 py-2"
    >
      {playing ? <Square size={15} /> : <Volume2 size={15} />}
      {playing ? 'Stop' : 'Play'}
    </button>
  );
}

function MicButton({
  listening,
  disabled,
  onStart,
  onStop,
  label,
}: {
  listening: boolean;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={listening ? onStop : onStart}
      aria-pressed={listening}
      aria-label={listening ? 'Stop recording' : label}
      title={disabled ? 'Speech input is not available in this browser' : undefined}
      className={`icon-btn h-11 w-11 text-white ${
        listening ? 'animate-pulse bg-red-700' : 'bg-forest-800 hover:bg-forest-700'
      }`}
    >
      {listening ? <Square size={18} /> : <Mic size={20} />}
    </button>
  );
}

// ── One-way translation ─────────────────────────────────────────────────────

interface Outcome {
  original: string;
  result: TranslationResult;
  from: string;
  to: string;
}

function TranslatePanel({
  source,
  target,
  synthesis,
}: {
  source: string;
  target: string;
  synthesis: Synthesis;
}) {
  const recognition = useSpeechRecognition();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const translate = async (input: string, from: string, to: string) => {
    const clean = input.trim();
    if (!clean) return;
    if (from === to) {
      setError('Choose two different languages.');
      return;
    }
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      const result = await itineraApi.translate(clean, from, to);
      setOutcome({ original: clean, result, from, to });
    } catch (failure) {
      setError(apiErrorMessage(failure, 'The translation failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const startListening = () =>
    recognition.start(languageByCode(source).speech, heard => {
      setText(heard);
      translate(heard, source, target);
    });

  const translatePhrase = (phrase: string) => {
    setText(phrase);
    // Phrases are written in English, so show them in a non-English language.
    translate(phrase, 'en', target === 'en' ? source : target);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <form
          className="card p-4"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            translate(text, source, target);
          }}
        >
          <label htmlFor="translate-text" className="label">
            {languageByCode(source).name}
          </label>
          <textarea
            id="translate-text"
            rows={4}
            maxLength={MAX_LENGTH}
            value={recognition.listening ? recognition.transcript : text}
            readOnly={recognition.listening}
            onChange={event => setText(event.target.value)}
            placeholder={recognition.listening ? 'Listening…' : 'Type here, or press the microphone and speak'}
            className="input resize-none"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MicButton
                listening={recognition.listening}
                disabled={!recognition.supported}
                onStart={startListening}
                onStop={recognition.stop}
                label={`Speak in ${languageByCode(source).name}`}
              />
              <span className="text-sm text-ink-soft" aria-live="polite">
                {recognition.listening ? 'Listening. Press stop when you finish.' : ''}
              </span>
            </div>
            <button type="submit" disabled={busy || !text.trim()} className="btn-primary">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
              Translate
            </button>
          </div>
        </form>

        {recognition.error && <ErrorNotice>{recognition.error}</ErrorNotice>}
        {error && <ErrorNotice>{error}</ErrorNotice>}

        {outcome && (
          <section className="card p-4" aria-live="polite" aria-label="Translation">
            <p className="text-sm text-ink-soft">
              <span className="font-semibold">{languageByCode(outcome.from).name}:</span>{' '}
              {outcome.original}
            </p>
            <p className="mt-3 text-sm font-semibold text-forest-500">
              {languageByCode(outcome.to).name}
            </p>
            <p lang={outcome.to} className="mt-0.5 text-2xl font-bold leading-snug">
              {outcome.result.translated_text}
            </p>
            {outcome.result.warning && (
              <p className="mt-2 text-sm font-medium text-ember-700">{outcome.result.warning}</p>
            )}
            <div className="mt-3">
              <PlayButton
                id="outcome"
                text={outcome.result.translated_text}
                code={outcome.to}
                synthesis={synthesis}
              />
            </div>
          </section>
        )}
      </div>

      <aside aria-label="Travel phrases" className="card p-4">
        <h2 className="font-bold">Travel phrases</h2>
        <p className="mb-3 text-sm text-ink-soft">Choose a phrase to translate it.</p>
        <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
          {PHRASE_GROUPS.map(group => (
            <section key={group.title}>
              <h3 className="eyebrow mb-1.5">{group.title}</h3>
              <ul className="space-y-1">
                {group.phrases.map(phrase => (
                  <li key={phrase}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => translatePhrase(phrase)}
                      className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-forest-50 disabled:opacity-50"
                    >
                      {phrase}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}

// ── Two-way conversation ────────────────────────────────────────────────────

interface Turn {
  id: string;
  side: 'a' | 'b';
  original: string;
  translated: string | null;
  warning: string | null;
  error: string | null;
  from: string;
  to: string;
}

function ConversationSide({
  side,
  language,
  speech,
  disabled,
  onSay,
}: {
  side: 'a' | 'b';
  language: string;
  speech: ReturnType<typeof useSpeechRecognition>;
  disabled: boolean;
  onSay: (side: 'a' | 'b', text: string) => void;
}) {
  const [text, setText] = useState('');
  const name = languageByCode(language).name;
  const listening = speech.listening;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    onSay(side, text);
    setText('');
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2 rounded-xl bg-canvas p-2">
      <MicButton
        listening={listening}
        disabled={!speech.supported || disabled}
        onStart={() => speech.start(languageByCode(language).speech, heard => onSay(side, heard))}
        onStop={speech.stop}
        label={`Person ${side.toUpperCase()}: speak in ${name}`}
      />
      <input
        className="input"
        value={listening ? speech.transcript : text}
        readOnly={listening}
        maxLength={MAX_LENGTH}
        onChange={event => setText(event.target.value)}
        placeholder={listening ? 'Listening…' : `Person ${side.toUpperCase()} (${name})`}
        aria-label={`Message from person ${side.toUpperCase()} in ${name}`}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        aria-label={`Send message from person ${side.toUpperCase()}`}
        className="icon-btn h-10 w-10 bg-forest-50 text-forest-800 hover:bg-forest-100"
      >
        <Send size={17} />
      </button>
    </form>
  );
}

function ConversationPanel({
  source,
  target,
  synthesis,
}: {
  source: string;
  target: string;
  synthesis: Synthesis;
}) {
  const speechA = useSpeechRecognition();
  const speechB = useSpeechRecognition();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  const say = async (side: 'a' | 'b', input: string) => {
    const original = input.trim();
    if (!original) return;
    const from = side === 'a' ? source : target;
    const to = side === 'a' ? target : source;
    const id = crypto.randomUUID();

    setTurns(all => [...all, { id, side, original, translated: null, warning: null, error: null, from, to }]);
    setBusy(true);

    try {
      const result = await itineraApi.translate(original, from, to);
      setTurns(all =>
        all.map(turn =>
          turn.id === id
            ? { ...turn, translated: result.translated_text, warning: result.warning }
            : turn
        )
      );
      if (autoPlay) {
        const language = languageByCode(to);
        synthesis.speak(result.translated_text, language.speech, language.name, id);
      }
    } catch (failure) {
      const message = apiErrorMessage(failure, 'The translation failed.');
      setTurns(all => all.map(turn => (turn.id === id ? { ...turn, error: message } : turn)));
    } finally {
      setBusy(false);
    }
  };

  const speechError = speechA.error ?? speechB.error;

  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={autoPlay}
            onChange={event => setAutoPlay(event.target.checked)}
            className="h-4 w-4 accent-[#164E3B]"
          />
          Read translations aloud automatically
        </label>
        <button
          type="button"
          disabled={turns.length === 0}
          onClick={() => setTurns([])}
          className="btn-ghost px-3 py-1.5"
        >
          <Trash2 size={15} /> Clear
        </button>
      </div>

      <ol className="mb-3 min-h-[260px] space-y-3 rounded-xl border border-line p-3" aria-live="polite">
        {turns.length === 0 && (
          <li className="py-16 text-center text-sm text-ink-soft">
            Take turns speaking or typing. Each message is translated for the other person.
          </li>
        )}
        {turns.map(turn => (
          <li key={turn.id} className={`flex ${turn.side === 'a' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 ${turn.side === 'a' ? 'bg-forest-50' : 'bg-ember-50'}`}>
              <p className="text-xs font-semibold text-ink-soft">
                Person {turn.side.toUpperCase()} · {languageByCode(turn.from).name}
              </p>
              <p className="text-sm">{turn.original}</p>
              {turn.translated && (
                <>
                  <p lang={turn.to} className="mt-1.5 text-lg font-bold leading-snug">
                    {turn.translated}
                  </p>
                  {turn.warning && <p className="text-xs font-medium text-ember-700">{turn.warning}</p>}
                  <div className="mt-1.5">
                    <PlayButton id={turn.id} text={turn.translated} code={turn.to} synthesis={synthesis} />
                  </div>
                </>
              )}
              {!turn.translated && !turn.error && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                  <Loader2 size={14} className="animate-spin" /> Translating
                </p>
              )}
              {turn.error && <p className="mt-1 text-sm font-medium text-red-800">{turn.error}</p>}
            </div>
          </li>
        ))}
      </ol>

      {speechError && <div className="mb-3"><ErrorNotice>{speechError}</ErrorNotice></div>}

      <div className="grid gap-3 md:grid-cols-2">
        <ConversationSide side="a" language={source} speech={speechA} disabled={busy || speechB.listening} onSay={say} />
        <ConversationSide side="b" language={target} speech={speechB} disabled={busy || speechA.listening} onSay={say} />
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function Translator() {
  const { profile } = useProfile();
  const synthesis = useSpeechSynthesis();
  const [source, setSource] = useState(profile.sourceLanguage);
  const [target, setTarget] = useState(profile.targetLanguage);
  const [mode, setMode] = useState<'translate' | 'conversation'>('translate');
  const [speechSupported] = useState(() => recognitionConstructor() !== null);

  const { data: provider } = useQuery({
    queryKey: ['translation-provider'],
    queryFn: itineraApi.getTranslationProvider,
    staleTime: Infinity,
  });

  const swap = () => {
    setSource(target);
    setTarget(source);
  };

  const targetVoiceMissing =
    synthesis.supported && !synthesis.voiceFor(languageByCode(target).speech);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold">CityWise Voice Translator</h1>
      <p className="mt-1 text-ink-soft">Speak with the people you meet, in their language.</p>

      <div className="card mt-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <LanguageSelect id="source-language" label="From" value={source} onChange={setSource} />
        <button
          type="button"
          onClick={swap}
          aria-label="Swap languages"
          className="icon-btn h-[42px] w-[42px] self-center border border-line bg-white hover:bg-forest-50 sm:self-end"
        >
          <ArrowLeftRight size={17} />
        </button>
        <LanguageSelect id="target-language" label="To" value={target} onChange={setTarget} />
      </div>

      <div className="mt-3 space-y-2">
        {source === target && (
          <ErrorNotice>Choose two different languages.</ErrorNotice>
        )}
        {!speechSupported && (
          <ErrorNotice>
            This browser does not support speech input. Typing still works, or use
            Chrome or Edge for the microphone.
          </ErrorNotice>
        )}
        {!synthesis.supported && <ErrorNotice>This browser cannot play speech.</ErrorNotice>}
        {synthesis.error && <ErrorNotice>{synthesis.error}</ErrorNotice>}
        {targetVoiceMissing && !synthesis.error && (
          <p className="flex items-start gap-2 text-sm text-ink-soft">
            <Info size={15} className="mt-0.5 flex-shrink-0" />
            No {languageByCode(target).name} voice was found on this device, so translations
            will show as text only.
          </p>
        )}
        {provider === 'mymemory' && (
          <p className="flex items-start gap-2 rounded-xl bg-ember-50 px-3.5 py-2.5 text-sm text-ink">
            <Info size={15} className="mt-0.5 flex-shrink-0" />
            These are free machine translations and can be wrong. Don’t rely on them
            alone for medical or emergency situations.
          </p>
        )}
      </div>

      <div className="my-5 flex gap-2" role="tablist" aria-label="Translator mode">
        {([
          ['translate', Languages, 'Translate'],
          ['conversation', MessagesSquare, 'Conversation'],
        ] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => {
              synthesis.stop();
              synthesis.clearError();
              setMode(key);
            }}
            className={`chip ${mode === key ? 'chip-active' : ''}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {mode === 'translate' ? (
        <TranslatePanel source={source} target={target} synthesis={synthesis} />
      ) : (
        <ConversationPanel source={source} target={target} synthesis={synthesis} />
      )}
    </div>
  );
}
