/**
 * Motor de Moderación Estricta para Golpea a Omar (Backend & Frontend)
 * Filtra lenguaje explícito, groserías, contenido sexual, insultos y evasiones (leetspeak, espaciado, símbolos).
 */

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  flaggedCategory?: 'groseria' | 'sexual' | 'insulto' | 'spam';
  matchedWord?: string;
}

// Diccionarios categorizados de términos y raíces prohibidas
const GROSERIAS: string[] = [
  'puta', 'puto', 'putita', 'puton', 'putaza', 'putazo', 'putamadre', 'ptm', 'hdp', 'hp',
  'hijoputa', 'hijaputa', 'hijadeputa', 'hijodeputa', 'hijueputa', 'hijueputas',
  'mierda', 'mierdon', 'mierdoso', 'mierdosa', 'caca',
  'carajo', 'carajos', 'verga', 'vergazo', 'vergon', 'vergudo',
  'pendejo', 'pendeja', 'pendejos', 'pendejas', 'pendejada', 'pendejadas',
  'culiao', 'culia', 'culiado', 'culiada', 'culicagado', 'culicagada',
  'cabron', 'cabrona', 'cabrones', 'cabronas', 'cabronazo',
  'malparido', 'malparida', 'malparidos', 'malparidas',
  'gonorrea', 'gonorreas',
  'chinga', 'chingar', 'chingada', 'chingado', 'chingados', 'chingon', 'chingadera',
  'coño', 'coñazo', 'cono', 'conazo', 'conchetumadre', 'conchatumadre', 'ctm', 'chucha', 'chuchatumadre',
  'joder', 'jodes', 'jodete', 'jodanse', 'jodido', 'jodida',
  'polla', 'pollas', 'chupapollas',
  'mamahuevo', 'mamaguevo', 'mamabicho', 'mamapinga',
  'perra', 'perras', 'zorra', 'zorras', 'bastardo', 'bastarda', 'bastardos',
  'carechimba', 'chimba', 'pirobo', 'piroba',
  // Inglés común
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'motherfucker', 'motherfucking',
  'shit', 'shits', 'shitty', 'bullshit',
  'bitch', 'bitches', 'bitching',
  'asshole', 'assholes', 'cunt', 'cunts', 'dick', 'dicks', 'dickhead', 'cock', 'cocks',
  'bastard', 'bastards', 'wanker', 'prick', 'slut', 'sluts', 'whore', 'whores'
];

const CONTENIDO_SEXUAL: string[] = [
  'sexo', 'porno', 'pornografia', 'xxx', 'paja', 'pajero', 'pajera', 'pajas',
  'masturbar', 'masturbacion', 'masturbarme', 'masturbarse',
  'tetas', 'tetonas', 'teta', 'pechos', 'tetotas',
  'culo', 'culote', 'culazos', 'ano', 'anal', 'anales',
  'semen', 'esperma', 'espermatozoide', 'cum',
  'follar', 'follando', 'coger', 'cogiendo', 'culear', 'culeando', 'coito',
  'chupamela', 'chupame', 'chupala', 'chupameelpecho', 'chupamelapolla',
  'mamada', 'mamadas', 'pete', 'petes',
  'clitoris', 'vagina', 'vaginas', 'vulva', 'pene', 'penes', 'pinga', 'pingas',
  'dildo', 'dildos', 'vibrador', 'orgasmo', 'orgasmos',
  'erotico', 'erotica', 'erotismo', 'hentai', 'nudes', 'nude', 'nopor',
  'desnuda', 'desnudo', 'desnudos', 'desnudas', 'encuerada', 'encuerado',
  'boobs', 'tits', 'pussy', 'blowjob', 'handjob', 'orgasm', 'naked'
];

const INSULTOS_ACOSO: string[] = [
  'estupido', 'estupida', 'estupidos', 'estupidas',
  'idiota', 'idiotas', 'imbecil', 'imbeciles',
  'retrasado', 'retrasada', 'retrasados', 'retrasadas',
  'mongolo', 'mongola', 'mongolico', 'mongolica',
  'tarado', 'tarada', 'tarados', 'taradas',
  'subnormal', 'subnormales', 'inutil', 'inutiles',
  'asqueroso', 'asquerosa', 'asquerosos',
  'basura', 'porqueria', 'escoria',
  'matate', 'suicidate', 'morite', 'muerete', 'ojala te mueras',
  'marica', 'maricon', 'maricones', 'marica', 'mariconada',
  'nigger', 'nigga', 'faggot', 'tranny', 'retard', 'retarded', 'dumbass', 'kill yourself', 'kys'
];

// Frases compuestas completas
const FRASES_PROHIBIDAS: string[] = [
  'hijo de puta', 'hija de puta', 'hijos de puta', 'hijas de puta',
  'tu puta madre', 'su puta madre', 'chupa la verga', 'chupa la pija',
  'chupame la verga', 'chupame la pija', 'chupame el pico', 'chupa el pico',
  'que te jodan', 'vete a la mierda', 'vayanse a la mierda', 'me cago en',
  'fuck you', 'fuck off', 'suck my dick', 'suck my', 'eat shit', 'piece of shit'
];

/**
 * Normaliza un texto removiendo acentos, diacríticos, caracteres repetidos y leetspeak.
 */
export function normalizeText(raw: string): string {
  if (!raw) return '';
  let str = raw.toLowerCase().trim();

  // 1. Descomposición y remoción de diacríticos y acentos
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 2. Reemplazo de caracteres de leetspeak / evasión
  const leetMap: { [key: string]: string } = {
    '@': 'a', '4': 'a',
    '3': 'e',
    '1': 'i', '!': 'i', '|': 'i',
    '0': 'o',
    '5': 's', '$': 's',
    '7': 't',
    '8': 'b',
    '9': 'g',
    'v': 'u'
  };

  str = str.replace(/[@431!|05$789v]/g, (char) => leetMap[char] || char);

  // 3. Reducir repeticiones excesivas de letras (e.g., "puuuuutaaa" -> "puuta" -> "puta")
  str = str.replace(/(.)\1{2,}/g, '$1$1');

  return str;
}

/**
 * Remueve espacios, puntos y símbolos para detectar palabras disimuladas
 * (ej: "p.u.t.a", "m-i-e-r-d-a", "p u t a")
 */
export function compactAlphaOnly(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Filtro de moderación estricto
 */
export function moderateText(text: string): ModerationResult {
  if (!text || typeof text !== 'string') {
    return { allowed: false, reason: 'El mensaje no puede estar vacío.' };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { allowed: false, reason: 'El mensaje está vacío.' };
  }

  if (trimmed.length > 250) {
    return { allowed: false, reason: 'El mensaje excede el límite máximo de 250 caracteres.' };
  }

  const normalized = normalizeText(trimmed);
  const compact = compactAlphaOnly(normalized);

  // 1. Comprobación de frases compuestas
  for (const frase of FRASES_PROHIBIDAS) {
    const fraseNorm = normalizeText(frase);
    if (normalized.includes(fraseNorm)) {
      return {
        allowed: false,
        flaggedCategory: 'groseria',
        reason: 'Tu mensaje contiene lenguaje ofensivo o insultos no permitidos.',
        matchedWord: frase
      };
    }
  }

  // 2. Comprobación de palabras en diccionarios por tokens (palabras completas con límites)
  // Tokenizar por separadores no alfanuméricos
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  // Palabras con variaciones reducidas (desduplicar totalmente a 1 letra para casos extremos)
  const singleCompressedTokens = tokens.map(t => t.replace(/(.)\1+/g, '$1'));

  // Verificación en GROSERIAS
  for (const w of GROSERIAS) {
    const wNorm = normalizeText(w);
    if (tokens.includes(wNorm) || singleCompressedTokens.includes(wNorm)) {
      return {
        allowed: false,
        flaggedCategory: 'groseria',
        reason: 'Tu mensaje contiene groserías o palabras altisonantes prohibidas.',
        matchedWord: w
      };
    }
  }

  // Verificación en CONTENIDO_SEXUAL
  for (const w of CONTENIDO_SEXUAL) {
    const wNorm = normalizeText(w);
    if (tokens.includes(wNorm) || singleCompressedTokens.includes(wNorm)) {
      return {
        allowed: false,
        flaggedCategory: 'sexual',
        reason: 'Tu mensaje contiene términos o referencias sexuales explícitas prohibidas.',
        matchedWord: w
      };
    }
  }

  // Verificación en INSULTOS_ACOSO
  for (const w of INSULTOS_ACOSO) {
    const wNorm = normalizeText(w);
    if (tokens.includes(wNorm) || singleCompressedTokens.includes(wNorm)) {
      return {
        allowed: false,
        flaggedCategory: 'insulto',
        reason: 'Tu mensaje contiene insultos o expresiones denigrantes prohibidas.',
        matchedWord: w
      };
    }
  }

  // 3. Detección de evasiones severas por compactación (ej: "p.u.t.a", "s-h-i-t", "p u t a")
  // Para términos de alta gravedad donde no haya falso positivo con palabras cotidianas
  const SEVERE_EVASION_WORDS = [
    'puta', 'puto', 'mierda', 'carajo', 'verga', 'pendejo', 'pendeja', 'culiao',
    'cabron', 'malparido', 'gonorrea', 'hdp', 'ptm', 'ctm', 'chucha',
    'porno', 'hentai', 'mamada', 'chupala', 'chupamela', 'matate', 'suicidate',
    'fucker', 'motherfucker', 'nigger', 'faggot'
  ];

  for (const severe of SEVERE_EVASION_WORDS) {
    // Si la cadena compactada contiene la palabra exacta y la longitud del texto es pequeña o está separada
    if (compact.includes(severe)) {
      // Excepciones conocidas de palabras comunes en español/inglés:
      // "computadora", "disputa", "imputar", "reputacion" contienen "puta"
      const allowedExceptions = ['computad', 'disput', 'imput', 'reputac', 'apunt', 'diput'];
      const hasException = allowedExceptions.some(exc => compact.includes(exc));
      if (!hasException) {
        return {
          allowed: false,
          flaggedCategory: 'groseria',
          reason: 'Tu mensaje contiene lenguaje explícito o evasiones de palabras prohibidas.',
          matchedWord: severe
        };
      }
    }
  }

  return { allowed: true };
}
