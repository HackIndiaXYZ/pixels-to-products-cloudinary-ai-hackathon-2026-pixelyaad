/**
 * Tag-based caption suggestions for Pixelyaad.
 *
 * Google Auto Tagging returns plain tags on the unsigned upload response.
 * We turn them into warm captions — English by default, with a Hindi toggle
 * that maps common auto-tag words to Hindi. The user can always edit before
 * saving; nothing is auto-posted.
 */

const HI_WORDS: Record<string, string> = {
  dog: 'कुत्ता', puppy: 'पिल्ला', cat: 'बिल्ली', kitten: 'बिल्ली का बच्चा',
  bird: 'पक्षी', horse: 'घोड़ा', cow: 'गाय', elephant: 'हाथी',
  garden: 'बगीचा', flower: 'फूल', flowers: 'फूल', tree: 'पेड़', trees: 'पेड़',
  park: 'पार्क', beach: 'समुद्र तट', sea: 'समुद्र', ocean: 'महासागर',
  mountain: 'पहाड़', mountains: 'पहाड़', snow: 'बर्फ', rain: 'बारिश',
  sunset: 'सूर्यास्त', sunrise: 'सूर्योदय', night: 'रात', sky: 'आसमान',
  happiness: 'खुशी', happy: 'खुश', smile: 'मुस्कान', smiling: 'मुस्कुराता',
  love: 'प्यार', family: 'परिवार', friends: 'दोस्त', friendship: 'दोस्ती',
  wedding: 'शादी', bride: 'दुल्हन', groom: 'दूल्हा',
  baby: 'बच्चा', child: 'बच्चा', children: 'बच्चे', kid: 'बच्चा',
  man: 'आदमी', woman: 'औरत', boy: 'लड़का', girl: 'लड़की', people: 'लोग',
  food: 'खाना', cake: 'केक', tea: 'चाय',
  festival: 'त्योहार', diwali: 'दीवाली', holi: 'होली', birthday: 'जन्मदिन',
  home: 'घर', house: 'घर', temple: 'मंदिर', church: 'चर्च', mosque: 'मस्जिद',
  car: 'गाड़ी', bike: 'बाइक', bicycle: 'साइकिल',
  city: 'शहर', village: 'गाँव', street: 'गली', market: 'बाज़ार',
  portrait: 'तस्वीर', selfie: 'सेल्फी', nature: 'प्रकृति', animal: 'जानवर',
  water: 'पानी', river: 'नदी', lake: 'झील',
};

const EN_TEMPLATES: Array<(tags: string[]) => string> = [
  (t) => `A beautiful memory: ${t.join(' · ')}`,
  (t) => `Some moments never fade — ${t.join(', ')}`,
  (t) => `Captured forever: ${t.join(' · ')}`,
];

const HI_TEMPLATES: Array<(tags: string[]) => string> = [
  (t) => `एक खूबसूरत याद: ${t.join(' · ')}`,
  (t) => `कुछ पल कभी नहीं भूलते — ${t.join(', ')}`,
  (t) => `हमेशा के लिए कैद: ${t.join(' · ')}`,
];

export type CaptionLang = 'en' | 'hi';

function clean(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim().toLowerCase();
    if (!t || t === 'pixelyaad' || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.slice(0, 4);
}

/** Suggest a caption from auto-tags. Stable per tag-set (no randomness). */
export function suggestCaption(tags: string[], lang: CaptionLang = 'en'): string {
  const top = clean(tags);
  if (top.length === 0) return '';
  const idx = top.join('|').length % 3;
  if (lang === 'hi') {
    const words = top.map((t) => HI_WORDS[t] ?? t);
    return HI_TEMPLATES[idx](words);
  }
  const words = top.map((t) => t.replace(/_/g, ' '));
  return EN_TEMPLATES[idx](words);
}

/** Re-suggest when the user flips the language toggle (keeps manual edits intact only if non-empty and custom — caller decides). */
export function captionLangLabel(lang: CaptionLang): string {
  return lang === 'hi' ? 'हिंदी' : 'English';
}
