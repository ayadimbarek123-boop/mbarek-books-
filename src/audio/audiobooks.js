const CATALOG_URL = `${import.meta.env.BASE_URL}audio/catalog.json`;

let catalog = { brand: 'MBAREK AUDIOBOOKS', narrator: 'Mbarek Ayadi', books: [] };

let currentAudio = null;

function safeMediaUrl(value, folder, extensions) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const base = new URL(import.meta.env.BASE_URL, window.location.origin);
    const url = new URL(value, base);
    const prefix = base.pathname.replace(/\/$/, '') + '/' + folder + '/';

    if (url.origin !== window.location.origin) return null;
    if (!url.pathname.startsWith(prefix)) return null;
    if (!extensions.some(ext => url.pathname.toLowerCase().endsWith(ext))) return null;
    return url.href;
  } catch {
    return null;
  }
}


export async function loadAudiobooks() {
  try {
    const response = await fetch(CATALOG_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    catalog = {
      brand: data.brand || 'MBAREK AUDIOBOOKS',
      narrator: data.narrator || 'Mbarek Ayadi',
      books: Array.isArray(data.books)
        ? data.books.filter(book =>
            book &&
            book.is_published === true &&
            Array.isArray(book.chapters) &&
            book.chapters.length > 0 &&
            book.chapters.every(chapter =>
              chapter &&
              safeMediaUrl(chapter.audio_url, 'audio', ['.mp3'])
            )
          )
        : []
    };
  } catch (error) {
    console.error('Audiobooks catalog error:', error);
    catalog.books = [];
  }

  return catalog;
}

export function renderAudiobooks() {
  const cards = catalog.books.map((book, index) => `
    <article class="audio-book-card">
      <div class="audio-book-cover">
        ${safeMediaUrl(book.cover, 'covers', ['.jpg', '.jpeg', '.png', '.webp'])
          ? `<img src="${escapeAttribute(safeMediaUrl(book.cover, 'covers', ['.jpg', '.jpeg', '.png', '.webp']))}" alt="${escapeAttribute(book.title)}">`
          : '<span class="audio-cover-mark">M</span>'}
      </div>
      <div class="audio-book-info">
        <span class="audio-book-label">AUDIOBOOK ${String(index + 1).padStart(2, '0')}</span>
        <h2>${escapeHTML(book.title)}</h2>
        <p>${escapeHTML(book.author || 'Unknown author')}</p>
        <span class="audio-narrator">Narrated by ${escapeHTML(catalog.narrator)}</span>
        <button class="audio-play-button" data-audio-book="${escapeAttribute(book.id)}">
          ▶ Listen now
        </button>
      </div>
    </article>
  `).join('');

  return `
    <section class="audiobooks-page">
      <div class="audio-hero">
        <span class="audio-eyebrow">THE VOICE OF KNOWLEDGE</span>
        <h1>MBAREK <b>AUDIOBOOKS</b></h1>
        <p>Discover stories and knowledge through sound.</p>
        <span class="audio-presenter">AUDIO EDITION · MBAREK AYADI</span>
      </div>
      <div class="audio-library-heading">
        <div>
          <span class="audio-eyebrow">LISTEN & DISCOVER</span>
          <h2>Audio Library</h2>
        </div>
        <span>${catalog.books.length} TITLES</span>
      </div>
      ${catalog.books.length
        ? `<div class="audio-book-grid">${cards}</div>`
        : `<div class="audio-empty">
            <span class="audio-empty-icon">♫</span>
            <h2>The audio library is being prepared</h2>
            <p>New audiobooks will appear here when they are ready for publication.</p>
          </div>`}
      <div class="audio-player" id="audioPlayer" hidden>
        <audio id="audiobookElement" preload="metadata"></audio>
        <div class="audio-player-details">
          <strong id="audioTrackTitle">MBAREK AUDIOBOOKS</strong>
          <span id="audioTrackChapter">Select a chapter</span>
        </div>
        <button id="audioPrevious" aria-label="Previous chapter">|◀</button>
        <button id="audioToggle" aria-label="Play or pause">▶</button>
        <button id="audioNext" aria-label="Next chapter">▶|</button>
        <span id="audioCurrentTime">00:00</span>
        <input id="audioSeek" type="range" min="0" max="100" value="0" aria-label="Audio progress">
        <span id="audioDuration">00:00</span>
        <select id="audioSpeed" aria-label="Playback speed">
          <option value="0.75">0.75×</option>
          <option value="1" selected>1×</option>
          <option value="1.25">1.25×</option>
          <option value="1.5">1.5×</option>
          <option value="2">2×</option>
        </select>
        <button id="audioClose" aria-label="Close player">×</button>
      </div>
    </section>
  `;
}

export function bindAudiobookEvents() {
  document.querySelectorAll('[data-audio-book]').forEach(button => {
    button.addEventListener('click', () => {
      const book = catalog.books.find(item => String(item.id) === button.dataset.audioBook);
      if (book) startAudiobook(book);
    });
  });
}

function startAudiobook(book) {
  const player = document.querySelector('#audioPlayer');
  const audio = document.querySelector('#audiobookElement');
  if (!player || !audio) return;

  currentAudio = { book, chapterIndex: 0 };
  player.hidden = false;
  player.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  playChapter();
  bindPlayerControls();
}

function playChapter() {
  if (!currentAudio) return;
  const { book, chapterIndex } = currentAudio;
  const chapter = book.chapters[chapterIndex];
  const audio = document.querySelector('#audiobookElement');
  if (!chapter || !audio) return;

  const safeAudioUrl = safeMediaUrl(chapter.audio_url, 'audio', ['.mp3']);
  if (!safeAudioUrl) return;
  audio.src = safeAudioUrl;
  document.querySelector('#audioTrackTitle').textContent = book.title;
  document.querySelector('#audioTrackChapter').textContent =
    chapter.title || `Chapter ${chapterIndex + 1}`;
  audio.play().catch(error => console.warn('Playback:', error));
  updateChapterButtons();
}

function bindPlayerControls() {
  const audio = document.querySelector('#audiobookElement');
  const toggle = document.querySelector('#audioToggle');
  const seek = document.querySelector('#audioSeek');
  const speed = document.querySelector('#audioSpeed');

  toggle.onclick = () => {
    if (audio.paused) audio.play();
    else audio.pause();
  };

  document.querySelector('#audioPrevious').onclick = () => changeChapter(-1);
  document.querySelector('#audioNext').onclick = () => changeChapter(1);

  document.querySelector('#audioClose').onclick = () => {
    audio.pause();
    audio.removeAttribute('src');
    document.querySelector('#audioPlayer').hidden = true;
    currentAudio = null;
  };

  speed.onchange = () => { audio.playbackRate = Number(speed.value); };
  seek.oninput = () => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = Number(seek.value) / 100 * audio.duration;
    }
  };

  audio.ontimeupdate = () => {
    const duration = audio.duration || 0;
    seek.value = duration ? audio.currentTime / duration * 100 : 0;
    document.querySelector('#audioCurrentTime').textContent = formatTime(audio.currentTime);
    document.querySelector('#audioDuration').textContent = formatTime(duration);
  };

  audio.onplay = () => { toggle.textContent = 'Ⅱ'; };
  audio.onpause = () => { toggle.textContent = '▶'; };
  audio.onended = () => changeChapter(1);
}

function changeChapter(direction) {
  if (!currentAudio) return;
  const next = currentAudio.chapterIndex + direction;
  if (next < 0 || next >= currentAudio.book.chapters.length) return;
  currentAudio.chapterIndex = next;
  playChapter();
}

function updateChapterButtons() {
  if (!currentAudio) return;
  document.querySelector('#audioPrevious').disabled = currentAudio.chapterIndex === 0;
  document.querySelector('#audioNext').disabled =
    currentAudio.chapterIndex >= currentAudio.book.chapters.length - 1;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[char]);
}

function escapeAttribute(value) {
  return escapeHTML(value);
}
