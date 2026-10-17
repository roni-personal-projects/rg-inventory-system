/**
 * Speech Recognition Post-Processor & Gift Shop Dictionary Normalizer
 *
 * Browsers often transcribe Indian names and retail gift terms phonetically
 * or incorrectly (e.g. "garnish" instead of "Ganesh", "deer" instead of "Diya",
 * "poo ja" instead of "Puja"). This module enhances accuracy by:
 * 1. Matching alternatives against domain gift shop vocabulary.
 * 2. Applying phonetic and Hinglish dictionary replacements.
 * 3. Cleaning casing, numbers, and units (e.g. "6 inch", "12 inch").
 * 4. Generating smart "Did you mean?" suggestions.
 */

export const GIFT_VOCABULARY = [
  'Ganesh Idol',
  'Ganpati Idol',
  'Brass Ganesh',
  'Marble Radha Krishna',
  'Laxmi Ganesh Idol',
  'Hanuman Idol',
  'Buddha Statue',
  'Shiv Parvati Idol',
  'Antique Wall Clock',
  'Digital Alarm Clock',
  'Wooden Table Clock',
  'Photo Frame',
  'Collage Photo Frame',
  'Acrylic Photo Frame',
  'Golden Temple Frame',
  'Brass Puja Thali',
  'Puja Thali Set',
  'Crystal Lotus Diya',
  'Brass Akhand Diya',
  'Aroma Diffuser Lamp',
  'Rotating LED Lamp',
  'Personalized Magic Mug',
  'Ceramic Coffee Mug',
  'Couple Showpiece',
  'Crystal Eiffel Tower',
  'Metallic Keychain',
  'Om & Swastik Keychain',
  'Wooden Pen Stand',
  'Cup & Saucer Set',
  'Crockery Dinner Set',
  'Agarbatti Stand',
  'Silver Plated Coin',
] as const;

// Common phonetic speech engine misrecognitions in English/Indian accent
const PHONETIC_MAP: Record<string, string> = {
  // Ganesh / Ganpati
  garnish: 'Ganesh',
  ganesha: 'Ganesh',
  ganesh: 'Ganesh',
  gunpati: 'Ganpati',
  ganpati: 'Ganpati',
  gannu: 'Ganesh',

  // Diya / Deepak
  'the ya': 'Diya',
  'the yaa': 'Diya',
  deeya: 'Diya',
  dia: 'Diya',
  deepak: 'Diya',
  diva: 'Diya',
  diyas: 'Diyas',

  // Puja / Pooja
  pooja: 'Puja',
  puja: 'Puja',
  'poo ja': 'Puja',
  'pooza': 'Puja',

  // Thali
  tali: 'Thali',
  thali: 'Thali',
  thaali: 'Thali',

  // God & Religious Names
  lakshmi: 'Laxmi',
  laxmi: 'Laxmi',
  radhe: 'Radha',
  radha: 'Radha',
  krishna: 'Krishna',
  krisna: 'Krishna',
  'shri ram': 'Shree Ram',
  'sri ram': 'Shree Ram',
  'ram mandir': 'Ram Mandir',
  hanuman: 'Hanuman',
  buddha: 'Buddha',
  budha: 'Buddha',
  murti: 'Murti',
  moorti: 'Murti',
  murthi: 'Murti',
  murtis: 'Murtis',
  idol: 'Idol',
  statue: 'Statue',

  // Clocks
  wallclock: 'Wall Clock',
  'wall clock': 'Wall Clock',
  clock: 'Clock',
  clocks: 'Clock',
  watch: 'Clock',

  // Frames
  photoframe: 'Photo Frame',
  'photo frame': 'Photo Frame',
  frame: 'Frame',
  frames: 'Frame',

  // Showpieces
  showpiece: 'Showpiece',
  'show piece': 'Showpiece',
  showpieces: 'Showpiece',

  // Mugs & Crockery
  mug: 'Mug',
  mugs: 'Mug',
  'magic mug': 'Magic Mug',
  crockery: 'Crockery',
  saucer: 'Saucer',
  cup: 'Cup',
  cups: 'Cup',

  // Keychains & Accessories
  keychain: 'Keychain',
  'key chain': 'Keychain',
  keychains: 'Keychain',
  penstand: 'Pen Stand',
  'pen stand': 'Pen Stand',
  diffuser: 'Diffuser',
  diffuserlamp: 'Diffuser Lamp',
  'agarbatti stand': 'Agarbatti Stand',
  agarbatti: 'Agarbatti',
  swastik: 'Swastik',
  swastika: 'Swastik',

  // Materials & Specs
  brass: 'Brass',
  wooden: 'Wooden',
  wood: 'Wooden',
  crystal: 'Crystal',
  acrylic: 'Acrylic',
  ceramic: 'Ceramic',
  marble: 'Marble',
  metal: 'Metallic',
  metallic: 'Metallic',
  golden: 'Golden',
  silver: 'Silver',
  'silver plated': 'Silver Plated',
  antique: 'Antique',
  rotating: 'Rotating',

  // Dimensions & Numbers
  'six inch': '6 inch',
  '6 inches': '6 inch',
  'eight inch': '8 inch',
  '8 inches': '8 inch',
  'nine inch': '9 inch',
  '9 inches': '9 inch',
  'ten inch': '10 inch',
  '10 inches': '10 inch',
  'twelve inch': '12 inch',
  '12 inches': '12 inch',
  'seven pieces': '7 pcs',
  'six pieces': '6 pcs',
  pair: 'Pair',
};

/**
 * Normalizes speech text by applying gift vocabulary corrections
 */
export function correctSpokenProduct(rawText: string): string {
  if (!rawText || !rawText.trim()) return '';

  let text = rawText.trim().toLowerCase();

  // 1. Multi-word phrase substitutions
  const multiWordReplacements: Array<[RegExp, string]> = [
    [/\bphoto\s*frame\b/gi, 'Photo Frame'],
    [/\bwall\s*clock\b/gi, 'Wall Clock'],
    [/\bshow\s*piece\b/gi, 'Showpiece'],
    [/\bkey\s*chain\b/gi, 'Keychain'],
    [/\bpen\s*stand\b/gi, 'Pen Stand'],
    [/\bpuja\s*thali\b/gi, 'Puja Thali'],
    [/\bpooja\s*thali\b/gi, 'Puja Thali'],
    [/\bpooja\s*tali\b/gi, 'Puja Thali'],
    [/\bradha\s*krishna\b/gi, 'Radha Krishna'],
    [/\bradhe\s*krishna\b/gi, 'Radha Krishna'],
    [/\blaxmi\s*ganesh\b/gi, 'Laxmi Ganesh'],
    [/\blakshmi\s*ganesh\b/gi, 'Laxmi Ganesh'],
    [/\bram\s*mandir\b/gi, 'Ram Mandir'],
    [/\bshree\s*ram\b/gi, 'Shree Ram'],
    [/\bshri\s*ram\b/gi, 'Shree Ram'],
    [/\bakhand\s*diya\b/gi, 'Akhand Diya'],
    [/\blotus\s*diya\b/gi, 'Lotus Diya'],
    [/\bmagic\s*mug\b/gi, 'Magic Mug'],
    [/\beiffel\s*tower\b/gi, 'Eiffel Tower'],
    [/\bsilver\s*plated\b/gi, 'Silver Plated'],
    [/\bmarble\s*dust\b/gi, 'Marble Dust'],
    [/\bcup\s*and\s*saucer\b/gi, 'Cup & Saucer'],
    [/\bcups?\s*and\s*saucers?\b/gi, 'Cup & Saucer'],
    [/\bsix\s*inch(es)?\b/gi, '6 inch'],
    [/\beight\s*inch(es)?\b/gi, '8 inch'],
    [/\bnine\s*inch(es)?\b/gi, '9 inch'],
    [/\bten\s*inch(es)?\b/gi, '10 inch'],
    [/\bthe\s*yaa?\b/gi, 'Diya'],
    [/\b(\d+)\s*inches\b/gi, '$1 inch'],
  ];

  for (const [pattern, replacement] of multiWordReplacements) {
    text = text.replace(pattern, replacement);
  }

  // 2. Word-by-word phonetic corrections
  const words = text.split(/\s+/);
  const correctedWords = words.map((w) => {
    const cleanWord = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (PHONETIC_MAP[cleanWord]) {
      return PHONETIC_MAP[cleanWord];
    }
    // Capitalize first letter of normal words
    return w.charAt(0).toUpperCase() + w.slice(1);
  });

  let result = correctedWords.join(' ');

  // Clean trailing punctuation or weird spacing
  result = result.replace(/\s+/g, ' ').replace(/\b(\d+)\s*Inch\b/g, '$1 inch').trim();
  return result;
}

/**
 * Finds the best transcript alternative among all choices provided by speech recognition
 */
export function pickBestAlternative(alternatives: string[]): string {
  if (!alternatives || alternatives.length === 0) return '';
  if (alternatives.length === 1) return correctSpokenProduct(alternatives[0]);

  // Score each alternative based on presence of known gift shop keywords
  let bestScore = -1;
  let bestAlt = alternatives[0];

  for (const alt of alternatives) {
    const corrected = correctSpokenProduct(alt);
    let score = 0;

    for (const kw of GIFT_VOCABULARY) {
      if (corrected.toLowerCase().includes(kw.toLowerCase())) {
        score += 10;
      }
    }

    // Give slight preference to options with specific product identifiers
    if (corrected.match(/\b(Idol|Clock|Frame|Diya|Mug|Thali|Keychain|Showpiece)\b/i)) {
      score += 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestAlt = corrected;
    }
  }

  return correctSpokenProduct(bestAlt);
}

/**
 * Generates relevant suggestions based on what was heard
 */
export function getGiftSuggestions(recognizedText: string): string[] {
  if (!recognizedText || recognizedText.length < 2) return [];

  const lower = recognizedText.toLowerCase();
  const suggestions: string[] = [];

  for (const item of GIFT_VOCABULARY) {
    const itemLower = item.toLowerCase();
    // Check if item contains words from recognizedText or vice-versa
    const words = lower.split(/\s+/).filter((w) => w.length > 2);
    const matchesWord = words.some((w) => itemLower.includes(w));

    if (matchesWord && !suggestions.includes(item)) {
      suggestions.push(item);
    }
    if (suggestions.length >= 4) break;
  }

  return suggestions;
}
