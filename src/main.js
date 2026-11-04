

import './style.css';
import { openReader, openPdfReader } from './reader/reader.js';

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

const categories = [
  'الكل', 'الأدب والروايات', 'التاريخ', 'الفلسفة',
  'العلوم', 'التكنولوجيا', 'التنمية البشرية',
  'الدين', 'علم النفس'
];

const books = [
  { id: 1, title: 'مئة عام من العزلة', author: 'غابرييل غارسيا ماركيز', category: 'الأدب والروايات', cover: 'https://covers.openlibrary.org/b/isbn/9780060883287-L.jpg', rating: '4.9' },
  { id: 2, title: '1984', author: 'جورج أورويل', category: 'الأدب والروايات', cover: 'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg', rating: '4.8' },
  { id: 3, title: 'العادات الذرية', author: 'جيمس كلير', category: 'التنمية البشرية', cover: 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg', rating: '4.9' },
  { id: 4, title: 'الأب الغني والأب الفقير', author: 'روبرت كيوساكي', category: 'التنمية البشرية', cover: 'https://covers.openlibrary.org/b/isbn/9781612680194-L.jpg', rating: '4.7' },
  { id: 5, title: 'فن الحرب', author: 'سون تزو', category: 'الفلسفة', cover: 'https://covers.openlibrary.org/b/isbn/9781590302255-L.jpg', rating: '4.8' },
  {
    id: 6,
    title: 'كبرياء وتحامل',
    originalTitle: 'Pride and Prejudice',
    author: 'جين أوستن',
    category: 'الأدب والروايات',
    cover: '/covers/6.jpg',
    rating: null,
    arabicAvailable: false,
    year: 1813,
    source: 'Project Gutenberg',
    sourceUrl: 'https://www.gutenberg.org/ebooks/1342'
  },
  {
    id: 7,
    title: 'مغامرات شرلوك هولمز',
    originalTitle: 'The Adventures of Sherlock Holmes',
    author: 'آرثر كونان دويل',
    category: 'الأدب والروايات',
    cover: '/covers/7.jpg',
    rating: null,
    arabicAvailable: false,
    year: 1892,
    source: 'Project Gutenberg',
    sourceUrl: 'https://www.gutenberg.org/ebooks/1661'
  },
  {
    id: 8,
    title: 'الأمير',
    originalTitle: 'The Prince',
    author: 'نيكولو مكيافيلي',
    category: 'الفلسفة',
    cover: '/covers/8.jpg',
    rating: null,
    arabicAvailable: false,
    year: 1532,
    source: 'Project Gutenberg',
    sourceUrl: 'https://www.gutenberg.org/ebooks/1232'
  },
  {
    id: 9,
    title: 'تأملات ماركوس أوريليوس',
    originalTitle: 'Thoughts of Marcus Aurelius',
    author: 'ماركوس أوريليوس',
    translator: 'George Long',
    category: 'الفلسفة',
    cover: '/covers/9.jpg',
    rating: null,
    arabicAvailable: false,
    year: 180,
    source: 'Project Gutenberg',
    sourceUrl: 'https://www.gutenberg.org/ebooks/6920'
  },
  {
    id: 10,
    title: 'الكونت دي مونت كريستو',
    originalTitle: 'The Count of Monte Cristo',
    author: 'ألكسندر دوما',
    category: 'الأدب والروايات',
    cover: '/covers/10.jpg',
    rating: null,
    arabicAvailable: false,
    year: 1844,
    source: 'Project Gutenberg',
    sourceUrl: 'https://www.gutenberg.org/ebooks/1184'
  },
  {
    id: 11,
    title: 'حول العالم في ثمانين يومًا',
    originalTitle: 'Around the World in Eighty Days',
    author: 'جول فيرن',
    translator: 'George M. Towle',
    category: 'الأدب والروايات',
    cover: '/covers/11.png',
    rating: null,
    arabicAvailable: false,
    year: 1872,
    source: 'Project Gutenberg',
    sourceUrl: 'https://www.gutenberg.org/ebooks/103'
  }
];

const app = document.querySelector('#app');

let activeCategory = 'الكل';
let searchQuery = '';
let activePage = 'home';
let favorites = JSON.parse(localStorage.getItem('mbarekFavorites') || '[]');
let readingList = JSON.parse(localStorage.getItem('mbarekReading') || '[]');
let selectedBook = null;

function bookCard(book) {
  const favorite = favorites.includes(book.id);

  return `
    <article class="book-card">
      <div class="book-cover-wrap" data-book="${book.id}">
        <img class="book-cover" src="${book.cover}" alt="${book.title}"
          onerror="this.src='https://placehold.co/300x430/151515/D6B15F?text=BOOK'">
        <button class="favorite-btn ${favorite ? 'active' : ''}"
          data-favorite="${book.id}" aria-label="إضافة للمفضلة">
          ${favorite ? '♥' : '♡'}
        </button>
      </div>
      <div class="book-info">
        ${book.rating ? `<div class="book-rating">★ ${book.rating}</div>` : ""}
        <h3>${book.title}</h3>
        <p>${book.author}</p>
        <button class="small-action" data-book="${book.id}">اكتشف الكتاب <span>←</span></button>
      </div>
    </article>
  `;
}

function renderHome() {
  const filtered = books.filter(book => {
    const matchesCategory = activeCategory === 'الكل' || book.category === activeCategory;
    const matchesSearch = `${book.title} ${book.author} ${book.category}`
      .toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return `
    <section class="hero">
      <div class="hero-content">
        <span class="eyebrow">عالم المعرفة بين يديك</span>
        <h1>كل كتاب هو<br><span>عالم جديد.</span></h1>
        <p>اكتشف آلاف الكتب، وانطلق في رحلة لا تنتهي من المعرفة والإلهام.</p>
        <button class="gold-button" id="exploreBtn">اكتشف المكتبة <span>←</span></button>
      </div>
      <div class="hero-decoration">
        <div class="hero-circle"></div>
        <div class="hero-book">M</div>
        <span class="decoration-text">KNOWLEDGE IS POWER</span>
      </div>
    </section>

    <section class="search-section" id="searchArea">
      <div class="section-heading">
        <div>
          <span class="eyebrow">اكتشف ما تبحث عنه</span>
          <h2>ابحث في المكتبة</h2>
        </div>
      </div>
      <div class="search-box">
        <span class="search-icon">⌕</span>
        <input id="bookSearch" value="${escapeHTML(searchQuery)}"
          placeholder="اسم الكتاب، المؤلف، أو الموضوع..." />
        <button id="searchBtn">بحث</button>
      </div>
    </section>

    <section class="categories-section">
      <div class="section-heading">
        <div>
          <span class="eyebrow">تصفح حسب اهتمامك</span>
          <h2>أقسام المكتبة</h2>
        </div>
      </div>
      <div class="category-list">
        ${categories.map(cat => `
          <button class="category-chip ${activeCategory === cat ? 'selected' : ''}"
            data-category="${cat}">${cat}</button>
        `).join('')}
      </div>
    </section>

    <section class="books-section" id="featuredBooks">
      <div class="section-heading">
        <div>
          <span class="eyebrow">اختياراتنا لك</span>
          <h2>${searchQuery ? 'نتائج البحث' : 'كتب تستحق القراءة'}</h2>
        </div>
        <span class="result-count">${filtered.length} كتب</span>
      </div>
      <div class="books-grid">
        ${filtered.length ? filtered.map(bookCard).join('') :
          '<div class="empty-state">لم نعثر على كتب مطابقة. جرّب كلمات أخرى.</div>'}
      </div>
    </section>

    <section class="quote-section">
      <span>✦</span>
      <p>الكتاب نافذة نطل منها على العالم.</p>
      <small>MBAREK BOOKS</small>
    </section>
  `;
}

function renderPersonalPage() {
  let list = activePage === 'favorites'
    ? books.filter(book => favorites.includes(book.id))
    : books.filter(book => readingList.includes(book.id));

  return `
    <section class="page-title">
      <span class="eyebrow">مساحتك الخاصة</span>
      <h1>${activePage === 'favorites' ? 'كتبي المفضلة' : 'قائمتي القرائية'}</h1>
      <p>احتفظ بكتبك المفضلة وتابع رحلتك المعرفية.</p>
    </section>
    <div class="books-grid">
      ${list.length ? list.map(bookCard).join('') :
        '<div class="empty-state">لا توجد كتب هنا بعد. اكتشف الكتب وأضف ما يعجبك.</div>'}
    </div>
  `;
}

function renderDetails(book) {
  return `
    <button class="back-btn" id="backBtn">→ العودة إلى المكتبة</button>
    <section class="details">
      <img src="${book.cover}" alt="${book.title}" onerror="this.style.display='none'">
      <div>
        <span class="eyebrow">${book.category}</span>
        <h1>${book.title}</h1>
        <p>تأليف: ${book.author}</p>
        ${book.originalTitle ? `<p>العنوان الأصلي: ${book.originalTitle}</p>` : ""}
        ${book.rating ? `<p>التقييم: ★ ${book.rating}</p>` : ""}
        ${book.year ? `<p>سنة النشر: ${book.year}</p>` : ""}
        <button class="gold-button" id="addReading">أضف إلى قائمتي القرائية</button>
        <button class="gold-button" id="openBookReader">اقرأ الكتاب ←</button>
        ${book.id === 1 ? '<a class="gold-button" href="https://openlibrary.org/books/OL22752164M/One_hundred_years_of_solitude" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none">استعارة الكتاب من Open Library ↗</a>' : ""}
        ${book.id === 4 ? '<button class="gold-button" id="chooseLocalPdf" type="button">اختيار نسخة PDF من الهاتف</button><input id="localPdfInput" type="file" accept="application/pdf,.pdf" hidden>' : ""}
        <p class="notice">بيانات الكتاب متاحة، استمتع بتجربة القراءة الرقمية من مكتبتك.</p>
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

function render() {
  let content = selectedBook
    ? renderDetails(selectedBook)
    : activePage === 'home'
      ? renderHome()
      : renderPersonalPage();

  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" id="brandHome">
        <span class="brand-mark">M</span>
        <span>MBAREK <b>BOOKS</b><small>YOUR DIGITAL LIBRARY</small></span>
      </a>
      <nav class="desktop-nav">
        <button data-page="home" class="${activePage === 'home' ? 'nav-active' : ''}">الرئيسية</button>
        <button data-page="reading" class="${activePage === 'reading' ? 'nav-active' : ''}">قائمتي القرائية</button>
        <button data-page="favorites" class="${activePage === 'favorites' ? 'nav-active' : ''}">المفضلة</button>
      </nav>
      <button class="header-search" id="headerSearch">⌕ <span>ابحث عن كتاب</span></button>
    </header>

    <main class="main-content">${content}</main>

    <footer class="footer">
      <div class="footer-brand">MBAREK <b>BOOKS</b></div>
      <p>المعرفة تبدأ من صفحة.</p>
      <span>© 2026 MBAREK BOOKS</span>
    </footer>

    <nav class="mobile-nav">
      <button data-page="home"><span>⌂</span>الرئيسية</button>
      <button data-page="reading"><span>▤</span>مكتبتي</button>
      <button data-page="favorites"><span>♡</span>المفضلة</button>
    </nav>
  `;

  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('[data-page]').forEach(button => {
    button.addEventListener('click', () => {
      activePage = button.dataset.page;
      selectedBook = null;
      render();
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
    button.addEventListener('click', () => {
      const id = Number(button.dataset.favorite);
      favorites = favorites.includes(id)
        ? favorites.filter(item => item !== id)
        : [...favorites, id];
      localStorage.setItem('mbarekFavorites', JSON.stringify(favorites));
      render();
    });
  });

  document.querySelectorAll('[data-book]').forEach(button => {
    button.addEventListener('click', () => {
      selectedBook = books.find(book => book.id === Number(button.dataset.book));
      render();
      window.scrollTo(0, 0);
    });
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
        alert('الرجاء اختيار ملف PDF صالح.');
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
    button.textContent = 'جارٍ تحميل الكتاب...';

    try {
      const response = await fetch(`/books/${book.id}.txt`);

      if (!response.ok) {
        throw new Error('لا يوجد نص متاح لهذا الكتاب حتى الآن.');
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const text = await response.text();

      if (!text.trim()) {
        throw new Error('ملف الكتاب فارغ.');
      }

      const isHtml =
        /text\/html|application\/xhtml\+xml/.test(contentType) ||
        /^\uFEFF?\s*(?:<!doctype\s+html|<html[\s>]|<(?:head|body|script|iframe)[\s>])/i.test(text);

      if (isHtml) {
        throw new Error('تعذر فتح الكتاب: المصدر أعاد صفحة ويب بدل نص الكتاب.');
      }

      openReader({ book, text });
    } catch (error) {
      alert(error.message || 'تعذر فتح الكتاب.');
    } finally {
      button.disabled = false;
      button.textContent = 'اقرأ الكتاب ←';
    }
  });

  document.querySelector('#addReading')?.addEventListener('click', () => {
    if (!readingList.includes(selectedBook.id)) {
      readingList.push(selectedBook.id);
      localStorage.setItem('mbarekReading', JSON.stringify(readingList));
    }
    alert('تمت إضافة الكتاب إلى قائمتك القرائية');
  });
}

render();

