const API_URL = 'https://api.mymemory.translated.net/get';
const DB_NAME = 'mbarekTranslationDB';
const STORE_NAME = 'translations';
const DAILY_LIMIT = 5000;
const MAX_CHUNK = 450;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCached(key) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function saveCached(key, value) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(value, key);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function hashText(value) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function splitText(text) {
  const chunks = [];
  let remaining = text.trim();

  while (remaining.length > MAX_CHUNK) {
    let cut = remaining.lastIndexOf(' ', MAX_CHUNK);

    if (cut < MAX_CHUNK * 0.5) {
      cut = MAX_CHUNK;
    }

    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

function getDailyUsage() {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const saved = JSON.parse(localStorage.getItem('mbarekTranslationUsage') || '{}');

    if (saved.date !== today) {
      return { date: today, characters: 0 };
    }

    return saved;
  } catch {
    return { date: today, characters: 0 };
  }
}

function addDailyUsage(amount) {
  const usage = getDailyUsage();
  usage.characters += amount;

  localStorage.setItem(
    'mbarekTranslationUsage',
    JSON.stringify(usage)
  );
}

export function getTranslationUsage() {
  const usage = getDailyUsage();

  return {
    used: usage.characters,
    remaining: Math.max(0, DAILY_LIMIT - usage.characters),
    limit: DAILY_LIMIT
  };
}

async function translateChunk(chunk) {
  const usage = getDailyUsage();

  if (usage.characters + chunk.length > DAILY_LIMIT) {
    throw new Error('وصلنا إلى الحد المجاني اليومي للترجمة. حاول غدًا.');
  }

  const params = new URLSearchParams({
    q: chunk,
    langpair: 'en|ar'
  });

  const response = await fetch(`${API_URL}?${params}`);

  if (!response.ok) {
    throw new Error('تعذر الاتصال بخدمة الترجمة.');
  }

  const data = await response.json();

  if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
    throw new Error(
      data.responseDetails || 'لم تتمكن خدمة الترجمة من ترجمة هذا الجزء.'
    );
  }

  addDailyUsage(chunk.length);

  return data.responseData.translatedText;
}

export async function translateText(bookId, text) {
  const normalized = String(text || '').trim();

  if (!normalized) return '';

  const cacheKey = `book-${bookId}-${hashText(normalized)}`;

  try {
    const cached = await getCached(cacheKey);
    if (cached) return cached;
  } catch {
    // نتابع الترجمة حتى لو تعذر الوصول إلى التخزين المؤقت.
  }

  const chunks = splitText(normalized);
  const translated = [];

  for (const chunk of chunks) {
    translated.push(await translateChunk(chunk));
  }

  const result = translated.join(' ');

  try {
    await saveCached(cacheKey, result);
  } catch {
    // تبقى الترجمة صالحة للعرض حتى لو تعذر حفظها.
  }

  return result;
}
