export interface Language {
  code: string;                // translation service code
  name: string;
  speech: string;              // BCP-47 tag for speech recognition and voices
}

// Keep in step with LANGUAGES in backend/services/translate_service.py.
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', speech: 'en-IN' },
  { code: 'kn', name: 'Kannada', speech: 'kn-IN' },
  { code: 'hi', name: 'Hindi', speech: 'hi-IN' },
  { code: 'ta', name: 'Tamil', speech: 'ta-IN' },
  { code: 'te', name: 'Telugu', speech: 'te-IN' },
  { code: 'ml', name: 'Malayalam', speech: 'ml-IN' },
  { code: 'es', name: 'Spanish', speech: 'es-ES' },
  { code: 'fr', name: 'French', speech: 'fr-FR' },
  { code: 'de', name: 'German', speech: 'de-DE' },
  { code: 'ja', name: 'Japanese', speech: 'ja-JP' },
  { code: 'ko', name: 'Korean', speech: 'ko-KR' },
];

export const languageByCode = (code: string): Language =>
  LANGUAGES.find(language => language.code === code) ?? LANGUAGES[0];

export const PHRASE_GROUPS: { title: string; phrases: string[] }[] = [
  {
    title: 'Directions',
    phrases: [
      'Where is the nearest railway station?',
      'How do I get to this address?',
      'Is it far from here?',
    ],
  },
  {
    title: 'Food',
    phrases: [
      'Can you recommend a restaurant?',
      'I am vegetarian.',
      'Please bring the bill.',
    ],
  },
  {
    title: 'Accommodation',
    phrases: [
      'I have a room reservation.',
      'Do you have a room for tonight?',
      'What time is check-out?',
    ],
  },
  {
    title: 'Transport',
    phrases: [
      'Please take me to this address.',
      'Which bus goes to the city centre?',
      'Please use the meter.',
    ],
  },
  {
    title: 'Shopping',
    phrases: [
      'How much does this cost?',
      'Can you reduce the price?',
      'Do you accept cards?',
    ],
  },
  {
    title: 'Emergency',
    phrases: [
      'I need help.',
      'Where is the nearest hospital?',
      'Please call the police.',
    ],
  },
];
