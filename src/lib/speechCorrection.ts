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
 * Removes duplicate words, incomplete prefix stutters, and repeated phrases/bigrams
 * commonly emitted by Mobile Chrome Web Speech API.
 * e.g. "brass brass bras brass brass ganes ganesh ganesh idol" -> "brass ganesh idol"
 */
export function cleanSpokenDuplicates(text: string): string {
  if (!text) return '';
  let words = text.trim().split(/\s+/);

  // 1. Remove repeated adjacent phrases of length 6 down to 2 words
  // e.g. "antique wooden wall clock antique wooden wall clock" -> "antique wooden wall clock"
  for (let len = 6; len >= 2; len--) {
    let i = 0;
    while (i + 2 * len <= words.length) {
      const phrase1 = words.slice(i, i + len).join(' ').toLowerCase();
      const phrase2 = words.slice(i + len, i + 2 * len).join(' ').toLowerCase();
      if (phrase1 === phrase2) {
        words.splice(i + len, len);
      } else {
        i++;
      }
    }
  }

  // 2. Remove consecutive word repeats and prefix stutters
  const result: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prev = result.length > 0 ? result[result.length - 1] : '';
    const lowerWord = word.toLowerCase();
    const lowerPrev = prev.toLowerCase();

    // Exact duplicate word
    if (lowerWord === lowerPrev) {
      continue;
    }

    // Previous word is incomplete prefix of current word (e.g. 'bras' then 'brass')
    if (prev && lowerWord.startsWith(lowerPrev) && lowerPrev.length >= 2 && lowerWord.length > lowerPrev.length) {
      result[result.length - 1] = word;
      continue;
    }

    // Current word is incomplete suffix or shortened repeat of previous (e.g. 'brass' then 'bras')
    if (prev && lowerPrev.startsWith(lowerWord) && lowerWord.length >= 2 && lowerPrev.length > lowerWord.length) {
      continue;
    }

    result.push(word);
  }

  // 3. Final single word dedupe pass
  const finalWords: string[] = [];
  for (let i = 0; i < result.length; i++) {
    if (i > 0 && result[i].toLowerCase() === finalWords[finalWords.length - 1]?.toLowerCase()) {
      continue;
    }
    finalWords.push(result[i]);
  }

  return finalWords.join(' ');
}

/**
 * Assembles speech recognition transcript chunks across both Mobile and Desktop browsers.
 * Seamlessly merges cumulative snapshots (Mobile Chrome) and incremental chunks (Desktop Chrome)
 * without duplicating overlapping sentences or words.
 */
export function assembleTranscript(chunks: string[]): string {
  if (!chunks || chunks.length === 0) return '';
  if (chunks.length === 1) return chunks[0].trim();

  let combined = chunks[0].trim();

  for (let i = 1; i < chunks.length; i++) {
    const next = (chunks[i] || '').trim();
    if (!next) continue;

    const lowerCombined = combined.toLowerCase();
    const lowerNext = next.toLowerCase();

    // 1. If next is identical to combined or combined already ends with next, skip
    if (lowerCombined === lowerNext || lowerCombined.endsWith(lowerNext)) {
      continue;
    }

    // 2. Mobile snapshot: If next starts with combined, next is the newer cumulative snapshot!
    if (lowerNext.startsWith(lowerCombined)) {
      combined = next;
      continue;
    }

    // 3. Mobile snapshot variant: If combined starts with next, combined is already longer
    if (lowerCombined.startsWith(lowerNext)) {
      continue;
    }

    // 4. Overlapping transition (e.g. combined = "brass ganesh", next = "ganesh idol")
    const wordsCombined = combined.split(/\s+/);
    const wordsNext = next.split(/\s+/);
    let overlapFound = false;

    const maxOverlap = Math.min(wordsCombined.length, wordsNext.length);
    for (let len = maxOverlap; len >= 1; len--) {
      const suffix = wordsCombined.slice(-len).join(' ').toLowerCase();
      const prefix = wordsNext.slice(0, len).join(' ').toLowerCase();
      if (suffix === prefix) {
        combined = wordsCombined.concat(wordsNext.slice(len)).join(' ');
        overlapFound = true;
        break;
      }
    }

    if (!overlapFound) {
      combined = `${combined} ${next}`;
    }
  }

  return combined.trim();
}

/**
 * Normalizes speech text by applying gift vocabulary corrections
 */
export function correctSpokenProduct(rawText: string): string {
  if (!rawText || !rawText.trim()) return '';

  // 0. Remove mobile speech duplicate words and stutter artifacts
  const deduplicated = cleanSpokenDuplicates(rawText);
  let text = deduplicated.trim().toLowerCase();

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
