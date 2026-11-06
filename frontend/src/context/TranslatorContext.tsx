/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface TranslatorContextValue {
  isOpen: boolean;
  openTranslator: () => void;
  closeTranslator: () => void;
}

const TranslatorContext = createContext<TranslatorContextValue | null>(null);

export function TranslatorProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openTranslator = useCallback(() => setIsOpen(true), []);
  const closeTranslator = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, openTranslator, closeTranslator }),
    [isOpen, openTranslator, closeTranslator]
  );

  return (
    <TranslatorContext.Provider value={value}>{children}</TranslatorContext.Provider>
  );
}

export function useTranslator(): TranslatorContextValue {
  const context = useContext(TranslatorContext);
  if (!context) throw new Error('useTranslator must be used inside TranslatorProvider');
  return context;
}
