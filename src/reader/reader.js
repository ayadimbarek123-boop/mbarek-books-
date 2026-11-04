import './reader.css';
import { translateText } from './translator.js';

const STORAGE_KEY = 'mbarekReaderProgress';

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[c]);
}

function savedProgress(id) {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')[id] || {};
  } catch {
    return {};
  }
}

function saveProgress(id, language, position) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const entry = all[id] || {};
    entry[language === 'en' ? 'enScroll' : 'arScroll'] = position;
    all[id] = entry;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

function isChapterHeading(value, language) {
  const line = value.trim();

  if (language === 'ar') {
    return /^(الفصل|الباب)\s/.test(line) ||
      /^(المقدمة|الخاتمة)\s*$/.test(line);
  }

  return /^(?:CHAPTER\s+[IVXLCDM]+\.?\s*.*|[IVXLCDM]+\.\s+[A-Z][A-Z\s,'’:\-–Œ]+)$/i.test(line);
}

function cleanParagraph(value) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^\s*\d+(?:\s*,\s*\d+)*\.\s+/, '')
    .replace(/^\s*[٠-٩]+(?:\s*,\s*[٠-٩]+)*\.\s+/, '')
    .trim();
}

function buildBook(text, language) {
  const blocks = text
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map(block => block.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const chapters = [];
  let current = {
    title: language === 'ar' ? 'مقدمة الكتاب' : 'INTRODUCTION',
    paragraphs: []
  };

  let inContents = false;

  for (const block of blocks) {
    if (/^contents$/i.test(block) || /^فهرس المحتويات$/.test(block)) {
      inContents = true;
      continue;
    }

    if (inContents) {
      if (isChapterHeading(block, language) ||
          /^[IVXLCDM]+\.\s+[A-Z]/.test(block)) {
        inContents = false;
      } else {
        continue;
      }
    }

    if (isChapterHeading(block, language)) {
      if (current.paragraphs.length) chapters.push(current);

      current = {
        title: block,
        paragraphs: []
      };
      continue;
    }

    const paragraph = cleanParagraph(block);
    if (paragraph) current.paragraphs.push(paragraph);
  }

  if (current.paragraphs.length) chapters.push(current);

  return chapters;
}

export function openReader({ book, text, onClose }) {
  if (!book || !text) {
    alert('نص الكتاب غير متاح.');
    return;
  }

  let language = 'en';
  let englishChapters = buildBook(text, 'en');
  let arabicChapters = null;
  let loadingArabic = false;
  let dynamicArabic = false;
  let renderedPages = [];
  let translationQueue = Promise.resolve();
  let translationObserver = null;
  let darkMode = false;

  const progress = savedProgress(book.id);

  const container = document.createElement('div');
  container.className = 'reader-overlay';

  container.innerHTML = `
    <div class="reader-window">
      <header class="book-toolbar">
        <button class="reader-close" aria-label="إغلاق">×</button>
        <div class="toolbar-title">${escapeHTML(book.title)}</div>
        <div class="toolbar-actions">
          <button class="reader-contents" type="button">الفهرس</button>
          <button class="reader-language" type="button">العربية</button>
          <button class="reader-theme" type="button" aria-label="تغيير المظهر">◐</button>
        </div>
      </header>

      <div class="reader-progress"><span></span></div>

      <main class="reader-content">
        <article class="reader-book"></article>
      </main>

      <aside class="contents-panel" hidden>
        <div class="contents-header">
          <h2>فهرس الفصول</h2>
          <button class="contents-close" type="button">×</button>
        </div>
        <nav class="contents-list"></nav>
      </aside>
    </div>
  `;

  document.body.appendChild(container);

  const contentArea = container.querySelector('.reader-content');
  const bookArea = container.querySelector('.reader-book');
  const languageButton = container.querySelector('.reader-language');
  languageButton.hidden = false;
  const contentsPanel = container.querySelector('.contents-panel');
  const contentsList = container.querySelector('.contents-list');
  const progressBar = container.querySelector('.reader-progress span');

  function currentChapters() {
    return language === 'en'
      ? englishChapters
      : (arabicChapters || englishChapters);
  }

  function renderBook() {
    if (translationObserver) {
      translationObserver.disconnect();
      translationObserver = null;
    }

    const chapters = currentChapters();
    container.classList.toggle('reader-arabic', language === 'ar');

    const pages = [];
    const toc = [];
    let number = 0;
    const maxChars = 1050;

    chapters.forEach((chapter) => {
      let group = [];
      let count = 0;
      let first = true;

      function addPage() {
        if (!group.length) return;

        number++;
        pages.push({
          number,
          title: first ? chapter.title : '',
          paragraphs: group
        });

        if (first) {
          toc.push({ title: chapter.title, pageIndex: pages.length - 1 });
        }

        group = [];
        count = 0;
        first = false;
      }

      chapter.paragraphs.forEach(paragraph => {
        if (group.length && count + paragraph.length > maxChars) {
          addPage();
        }

        group.push(paragraph);
        count += paragraph.length;
      });

      addPage();
    });

    renderedPages = pages;
    bookArea.innerHTML = pages.map((page, index) => `
      <section class="book-page" id="book-section-${index}">
        ${page.title
          ? `<h2 class="chapter-heading">${escapeHTML(page.title)}</h2>`
          : ''}
        <div class="book-page-text">
          ${page.paragraphs.map((p, paragraphIndex) =>
          `<p data-translation-index="${paragraphIndex}">${escapeHTML(p)}</p>`
        ).join('')}
        </div>
        <div class="page-number">— ${page.number} —</div>
      </section>
    `).join('');

    contentsList.innerHTML = toc.map(item => `
      <button class="toc-entry" type="button" data-index="${item.pageIndex}">
        ${escapeHTML(item.title)}
      </button>
    `).join('');

    contentsList.querySelectorAll('.toc-entry').forEach(button => {
      button.addEventListener('click', () => {
        const section = bookArea.querySelector(
          `#book-section-${button.dataset.index}`
        );

        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        contentsPanel.hidden = true;
      });
    });

    languageButton.textContent = language === 'en' ? 'العربية' : 'English';

    if (language === 'ar' && dynamicArabic) {
      observeArabicPages();
    }
  }

  function observeArabicPages() {
    const sections = bookArea.querySelectorAll('.book-page');

    async function translatePage(section) {
    if (section.dataset.translationStarted === 'yes') return;

    const pageIndex = Number(section.id.replace('book-section-', ''));
    const page = renderedPages[pageIndex];
    if (!page) return;

    section.dataset.translationStarted = 'yes';

    const notice = document.createElement('p');
    notice.className = 'translation-status';
    notice.textContent = 'جارٍ ترجمة الصفحة…';
    notice.style.cssText = 'color:#92764d;text-align:center;padding:12px;font:14px Arial';

    const previousNotice = section.querySelector('.translation-status');
    if (previousNotice) previousNotice.remove();
    section.prepend(notice);

    try {
      const heading = section.querySelector('.chapter-heading');

      if (heading && page.title) {
        heading.textContent = await translateText(book.id, page.title);
      }

      const paragraphs = section.querySelectorAll('[data-translation-index]');

      for (const paragraph of paragraphs) {
        const index = Number(paragraph.dataset.translationIndex);
        const original = page.paragraphs[index];
        if (!original) continue;

        paragraph.textContent = await translateText(book.id, original);
      }

      notice.textContent = 'اكتملت ترجمة الصفحة';
      notice.style.color = '#63845d';
      section.dataset.translationStarted = 'done';
    } catch (error) {
      section.dataset.translationStarted = 'error';
      notice.textContent = error.message || 'تعذرت ترجمة الصفحة.';

      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'إعادة المحاولة';
      retry.style.cssText = 'display:block;margin:8px auto;padding:8px 16px;cursor:pointer';

      retry.addEventListener('click', () => {
        section.dataset.translationStarted = '';
        translatePage(section);
      });

      notice.appendChild(retry);
      notice.style.color = '#a65b35';
    }
  }

    if (!('IntersectionObserver' in window)) {
      if (sections[0]) {
        translationQueue = translationQueue.then(() => translatePage(sections[0]));
      }
      return;
    }

    translationObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        translationObserver.unobserve(entry.target);
        translationQueue = translationQueue.then(() => translatePage(entry.target));
      }
    }, {
      root: contentArea,
      rootMargin: '100px 0px',
      threshold: 0.01
    });

    sections.forEach(section => translationObserver.observe(section));
  }

  function updateProgress() {
    const max = contentArea.scrollHeight - contentArea.clientHeight;
    const percent = max > 0
      ? (contentArea.scrollTop / max) * 100
      : 0;

    progressBar.style.width = `${percent}%`;
    saveProgress(book.id, language, contentArea.scrollTop);
  }

  let scrollSave = 0;

  contentArea.addEventListener('scroll', () => {
    if (!scrollSave) {
      scrollSave = requestAnimationFrame(() => {
        updateProgress();
        scrollSave = 0;
      });
    }
  });

  async function toggleLanguage() {
    if (loadingArabic) return;

    saveProgress(book.id, language, contentArea.scrollTop);

    if (language === 'en') {
      if (!arabicChapters) {
        loadingArabic = true;
        languageButton.disabled = true;
        languageButton.textContent = 'جارٍ التحميل...';

        try {
          const response = await fetch(`/books/${book.id}.ar.txt`);
          const contentType = response.headers.get('content-type') || '';
          const translatedText = await response.text();

          const isHtml =
            /text\/html/i.test(contentType) ||
            /^\s*(?:<!doctype\s+html|<html[\s>])/i.test(translatedText);

          if (response.ok && translatedText.trim() && !isHtml) {
            arabicChapters = buildBook(translatedText, 'ar');
            dynamicArabic = false;
          } else {
            arabicChapters = null;
            dynamicArabic = true;
          }
        } catch (error) {
          dynamicArabic = true;
          arabicChapters = null;
        }

        loadingArabic = false;
        languageButton.disabled = false;
      }

      language = 'ar';
    } else {
      language = 'en';
    }

    renderBook();

    const latestProgress = savedProgress(book.id);
    contentArea.scrollTop = latestProgress[
      language === 'en' ? 'enScroll' : 'arScroll'
    ] || 0;

    updateProgress();
  }

  function persistReadingPosition() {
    saveProgress(book.id, language, contentArea.scrollTop);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) persistReadingPosition();
  });

  window.addEventListener('pagehide', persistReadingPosition);

  function close() {
    persistReadingPosition();
    document.removeEventListener('keydown', keyboardHandler);
    container.remove();
    if (onClose) onClose();
  }

  function keyboardHandler(event) {
    if (event.key === 'Escape') {
      if (!contentsPanel.hidden) {
        contentsPanel.hidden = true;
      } else {
        close();
      }
    }
  }

  container.querySelector('.reader-close')
    .addEventListener('click', close);

  languageButton.addEventListener('click', toggleLanguage);

  container.querySelector('.reader-contents')
    .addEventListener('click', () => {
      contentsPanel.hidden = !contentsPanel.hidden;
    });

  container.querySelector('.contents-close')
    .addEventListener('click', () => {
      contentsPanel.hidden = true;
    });

  container.querySelector('.reader-theme')
    .addEventListener('click', () => {
      darkMode = !darkMode;
      container.classList.toggle('reader-dark-paper', darkMode);
    });

  document.addEventListener('keydown', keyboardHandler);

  renderBook();

  requestAnimationFrame(() => {
    contentArea.scrollTop = progress.enScroll || 0;
    updateProgress();
  });
}
