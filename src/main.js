

import { loadAudiobooks, renderAudiobooks, bindAudiobookEvents } from './audio/audiobooks.js';
import './style.css';
import { openReader, openPdfReader } from './reader/reader.js';
import { books } from './data/books.js';

const icons = {
  home: '⌂',
  search: '⌕',
  library: '▤',
  bookmark: '♧',
  heart: '♡',
  history: '◷',
  settings: '⚙',
  user: '◉',
  book: '▣',
  arrow: '→',
  menu: '☰'
};

const categoryLabel = category => category || 'Uncategorized';
const categories = ['All', ...new Set(books.map(book => book.category).filter(Boolean))];



const app = document.querySelector('#app');

let activeCategory = 'All';
let searchQuery = '';
let sortOrder = 'default';
let activePage = 'home';

function loadSavedIds(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value)
      ? value.filter(id => Number.isSafeInteger(id) && id > 0)
      : [];
  } catch {
    return [];
  }
}

function saveSavedIds(key, ids) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
    return true;
  } catch {
    return false;
  }
}

let favorites = loadSavedIds('mbarekFavorites');
let readingList = loadSavedIds('mbarekReading');
let selectedBook = null;

function bookCard(book) {
  const favorite = favorites.includes(book.id);
  const title = escapeHTML(book.title);
  const author = escapeHTML(book.author);
  const cover = escapeHTML(book.cover || '');
  const id = Number.isSafeInteger(book.id) ? book.id : 0;
  const rating = Number.isFinite(Number(book.rating)) && Number(book.rating) >= 0 && Number(book.rating) <= 5 ? Number(book.rating).toFixed(1) : '';

  return `
    <article class="book-card">
      <div class="book-cover-wrap" data-book="${id}">
        <img class="book-cover" src="${cover}" alt="${title}"
         >
        <button class="favorite-btn ${favorite ? 'active' : ''}"
          data-favorite="${id}" aria-label="Add to favorites">
          ${favorite ? '♥' : '♡'}
        </button>
      </div>
      <div class="book-info">
        ${rating ? `<div class="book-rating">★ ${rating} <small>${book.ratingVerified ? "Verified" : "Unverified"}</small></div>` : ""}
        <h3>${title}</h3>
        <p>${author}</p>
        <button class="small-action" data-book="${id}">Discover book <span>←</span></button>
      </div>
    </article>
  `;
}


function renderHome() {
  const filtered = books.filter(book => {
    const matchesCategory = activeCategory === 'All' || book.category === activeCategory;
    const matchesSearch = `${book.title} ${book.titleAr || ''} ${book.author} ${book.authorAr || ''} ${book.category || ''}`
      .toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sorted = [...filtered];
  if (sortOrder === 'rating') {
    sorted.sort((a, b) => {
      const verifiedOrder = Number(Boolean(b.ratingVerified)) - Number(Boolean(a.ratingVerified));
      if (verifiedOrder !== 0) return verifiedOrder;
      return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    });
  }

  return `
    <section class="hero">
      <div class="hero-content">

        <h1>Every book is a<br><span>new world.</span></h1>

        <button class="gold-button" id="exploreBtn">Explore the library <span>←</span></button>
      </div>
    </section>

      <section class="search-section" id="searchArea">
      <div class="section-heading">
        <div>

          <h2>Search the library</h2>
        </div>
      </div>
      <div class="search-box">
        <span class="search-icon">⌕</span>
        <input id="bookSearch" value="${escapeHTML(searchQuery)}"
          placeholder="Book title, author, or topic..." />
        <button id="searchBtn">Search</button>
      </div>
    </section>

    <section class="categories-section">
      <div class="section-heading">
        <div>

          <h2>Library categories</h2>
        </div>
      </div>
      <div class="category-list">
        ${categories.map(cat => `
          <button class="category-chip ${activeCategory === cat ? 'selected' : ''}"
            data-category="${escapeHTML(cat)}">${escapeHTML(categoryLabel(cat))}</button>
        `).join('')}
      </div>
    </section>



    <section class="books-section" id="featuredBooks">
      <div class="section-heading">
        <div>

          <h2>${searchQuery ? 'Search results' : 'Books worth reading'}</h2>
        </div>
        <div class="books-tools">
          <span class="result-count">${filtered.length} books</span>
          <button class="sort-button" id="sortBooks" type="button">
            ${sortOrder === 'rating' ? '↕ Default order' : '★ Top rated'}
          </button>
        </div>
      </div>
      <div class="books-grid">
        ${sorted.length ? sorted.map(bookCard).join('') :
          '<div class="empty-state">No matching books found. Try different keywords.</div>'}
      </div>
    </section>


  `;
}

function renderPersonalPage() {
  let list = activePage === 'favorites'
    ? books.filter(book => favorites.includes(book.id))
    : books.filter(book => readingList.includes(book.id));

  return `
    <section class="page-title">
      <span class="eyebrow">Your personal space</span>
      <h1>${activePage === 'favorites' ? 'My favorites' : 'My reading list'}</h1>
      <p>Save your favorite books and follow your reading journey.</p>
    </section>
    <div class="books-grid">
      ${list.length ? list.map(bookCard).join('') :
        '<div class="empty-state">There are no books here yet. Explore the library and add your favorites.</div>'}
    </div>
  `;
}

function renderDetails(book) {
  const title = escapeHTML(book.title);
  const author = escapeHTML(book.author);
  const category = escapeHTML(categoryLabel(book.category));
  const cover = escapeHTML(book.cover || '');
  const originalTitle = escapeHTML(book.originalTitle || '');
  const rating = Number.isFinite(Number(book.rating)) && Number(book.rating) >= 0 && Number(book.rating) <= 5 ? Number(book.rating).toFixed(1) : '';

  return `
    <button class="back-btn" id="backBtn">→ Back to library</button>
    <section class="details">
      <img src="${cover}" alt="${title}">
      <div>
        <span class="eyebrow">${category}</span>
        <h1>${title}</h1>
        <p>By: ${author}</p>
        ${book.originalTitle ? `<p>Original title: ${originalTitle}</p>` : ""}
        ${rating ? `<p>Rating: ★ ${rating} — ${book.ratingVerified ? "Verified by Goodreads" : "Unverified"}</p>` : ""}
        ${book.year ? `<p>Publication year: ${book.year}</p>` : ""}
        <button class="gold-button" id="addReading">Add to my reading list</button>
        ${book.textUrl
          ? '<button class="gold-button" id="openBookReader">Read book ←</button>'
          : book.externalReadUrl
            ? `<a class="gold-button" href="${safeExternalUrl(book.externalReadUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none">Read from source ↗</a>`
            : '<p class="notice">The reading edition is currently unavailable.</p>'}
        ${book.id === 1 ? '<a class="gold-button" href="https://openlibrary.org/books/OL22752164M/One_hundred_years_of_solitude" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none">Borrow from Open Library ↗</a>' : ""}
        ${book.id === 4 ? '<button class="gold-button" id="chooseLocalPdf" type="button">Choose a PDF from your device</button><input id="localPdfInput" type="file" accept="application/pdf,.pdf" hidden>' : ""}
        <p class="notice">Book details are available. Enjoy your digital reading experience.</p>
      </div>
    </section>
  `;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[char]);
}

function safeExternalUrl(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? escapeHTML(url.href) : '';
  } catch {
    return '';
  }
}

function render() {
  let content = selectedBook
    ? renderDetails(selectedBook)
    : activePage === 'home'
      ? renderHome()
      : activePage === 'audiobooks'
        ? renderAudiobooks()
        : renderPersonalPage();

  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" id="brandHome">
        <span class="brand-mark">M</span>
        <span>MBAREK <b>BOOKS</b><small>YOUR DIGITAL LIBRARY</small></span>
      </a>
      <nav class="desktop-nav">
        <button data-page="home" class="${activePage === 'home' ? 'nav-active' : ''}">Home</button>
        <button data-page="reading" class="${activePage === 'reading' ? 'nav-active' : ''}">My reading list</button>
        <button data-page="favorites" class="${activePage === 'favorites' ? 'nav-active' : ''}">Favorites</button>
        <button data-page="audiobooks" class="${activePage === 'audiobooks' ? 'nav-active' : ''}">Audiobooks</button>
      </nav>
      <button class="header-search" id="headerSearch">⌕ <span>Find a book</span></button>
    </header>

    <main class="main-content">${content}</main>

    <footer class="footer">
      <div class="footer-signature">
        <div class="footer-founder">
          <img src="${import.meta.env.BASE_URL}images/mbarek-portrait.jpg" alt="Mbarek Ayadi" class="footer-portrait">
          <div class="footer-founder-info">
            <span class="footer-label">FOUNDED & CREATED BY</span>
            <strong>MBAREK AYADI</strong>
            <span class="footer-role">Founder & Creator</span>
          </div>
        </div>

        <div class="footer-message">
          <p>Knowledge begins with a page.</p>
          <span>Built with passion by Mbarek Ayadi.</span>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© 2026 MBAREK BOOKS</span>
        <span>AN INDEPENDENT DIGITAL LIBRARY</span>
      </div>
    </footer>

    <nav class="mobile-nav">
      <button data-page="home"><span>⌂</span>Home</button>
      <button data-page="reading"><span>▤</span>My Library</button>
      <button data-page="favorites"><span>♡</span>Favorites</button>
      <button data-page="audiobooks" class="${activePage === 'audiobooks' ? 'nav-active' : ''}"><span>♫</span>Audio</button>
    </nav>
  `;

  bindEvents();
  if (activePage === 'audiobooks' && !selectedBook) bindAudiobookEvents();
}

function bindEvents() {
  document.querySelectorAll('[data-page]').forEach(button => {
    button.addEventListener('click', () => {
      activePage = button.dataset.page;
      selectedBook = null;
      render();
      if (activePage === 'audiobooks') {
        loadAudiobooks().then(() => {
          if (activePage === 'audiobooks' && !selectedBook) render();
        }).catch(error => console.error('Audiobooks loading failed:', error));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.category;
      render();
    });
  });

  document.querySelectorAll('[data-favorite]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      const id = Number(button.dataset.favorite);
      favorites = favorites.includes(id)
        ? favorites.filter(item => item !== id)
        : [...favorites, id];
      saveSavedIds('mbarekFavorites', favorites);
      render();
    });
  });

  document.querySelectorAll('[data-book]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      selectedBook = books.find(book => book.id === Number(button.dataset.book));
      render();
      window.scrollTo(0, 0);
    });
  });

  document.querySelector('#sortBooks')?.addEventListener('click', () => {
    sortOrder = sortOrder === 'rating' ? 'default' : 'rating';
    render();
  });

  const search = document.querySelector('#bookSearch');
  const searchBtn = document.querySelector('#searchBtn');

  if (search) {
    search.addEventListener('input', event => {
      searchQuery = event.target.value;
      const position = event.target.selectionStart;
      render();
      const next = document.querySelector('#bookSearch');
      next.focus();
      next.setSelectionRange(position, position);
    });
  }

  if (searchBtn) searchBtn.addEventListener('click', () => {
    searchQuery = search.value;
    render();
  });

  const headerSearch = document.querySelector('#headerSearch');
  if (headerSearch) headerSearch.addEventListener('click', () => {
    activePage = 'home';
    selectedBook = null;
    render();
    document.querySelector('#searchArea')?.scrollIntoView({ behavior: 'smooth' });
    document.querySelector('#bookSearch')?.focus();
  });

  document.querySelector('#brandHome')?.addEventListener('click', event => {
    event.preventDefault();
    activePage = 'home';
    selectedBook = null;
    searchQuery = '';
    render();
    window.scrollTo(0, 0);
  });

  document.querySelector('#exploreBtn')?.addEventListener('click', () => {
    document.querySelector('#featuredBooks')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.querySelector('#backBtn')?.addEventListener('click', () => {
    selectedBook = null;
    render();
  });

  const choosePdfButton = document.querySelector('#chooseLocalPdf');
  const localPdfInput = document.querySelector('#localPdfInput');

  if (choosePdfButton && localPdfInput) {
    choosePdfButton.addEventListener('click', () => localPdfInput.click());

    localPdfInput.addEventListener('change', () => {
      const file = localPdfInput.files?.[0];
      if (!file) return;

      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Please select a valid PDF file.');
        localPdfInput.value = '';
        return;
      }

      openPdfReader({ book: selectedBook, file });
      localPdfInput.value = '';
    });
  }

  document.querySelector('#openBookReader')?.addEventListener('click', async () => {
    const button = document.querySelector('#openBookReader');
    const book = selectedBook;

    if (!book) return;

    button.disabled = true;
    button.textContent = 'Loading book...';

    try {
      const response = await fetch(book.textUrl || `${import.meta.env.BASE_URL}books/${book.id}.txt`);

      if (!response.ok) {
        throw new Error('The book text is not available yet.');
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > 10 * 1024 * 1024) {
        throw new Error('Book files must be 10 MB or smaller.');
      }
      const text = await response.text();
      if (new Blob([text]).size > 10 * 1024 * 1024) {
        throw new Error('Book files must be 10 MB or smaller.');
      }

      if (!text.trim()) {
        throw new Error('The book file is empty.');
      }

      const isHtml =
        /text\/html|application\/xhtml\+xml/.test(contentType) ||
        /^\uFEFF?\s*(?:<!doctype\s+html|<html[\s>]|<(?:head|body|script|iframe)[\s>])/i.test(text);

      if (isHtml) {
        throw new Error('Unable to open the book: the source returned a web page instead of book text.');
      }

      openReader({ book, text });
    } catch (error) {
      alert(error.message || 'Unable to open the book.');
    } finally {
      button.disabled = false;
      button.textContent = 'Read book ←';
    }
  });

  document.querySelector('#addReading')?.addEventListener('click', () => {
    if (!readingList.includes(selectedBook.id)) {
      readingList.push(selectedBook.id);
      saveSavedIds('mbarekReading', readingList);
    }
    alert('Book added to your reading list.');
  });
}

render();

