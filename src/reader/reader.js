import './reader.css';

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

function saveProgress(id, position) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const entry = all[id] || {};
    entry.enScroll = position;
    all[id] = entry;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

function isChapterHeading(value) {
  const line = value.trim();
  return /^(?:CHAPTER\s+[IVXLCDM]+\.?\s*.*|[IVXLCDM]+\.\s+[A-Z][A-Z\s,'’:\-–Œ]+)$/i.test(line);
}

function cleanParagraph(value) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^\s*\d+(?:\s*,\s*\d+)*\.\s+/, '')
    .replace(/\[Illustration\]/gi, '')
    .replace(/(^|\s)_([^_]+)_(?=\s|[.,!?;:]|$)/g, '$1$2')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();
}

function extractGutenbergBody(text) {
  const source = String(text).replace(/\r/g, '');
  const start = source.match(/^[ \t]*\*{3}[ \t]*START OF THE PROJECT GUTENBERG EBOOK\b[^\r\n]*\*{3}[ \t]*$/im);
  const end = source.match(/^[ \t]*\*{3}[ \t]*END OF THE PROJECT GUTENBERG EBOOK\b[^\r\n]*\*{3}[ \t]*$/im);

  if (start && end && end.index > start.index) {
    return source.slice(start.index + start[0].length, end.index);
  }
  return source;
}

function buildBook(text) {
  const blocks = extractGutenbergBody(text)
    .split(/\n\s*\n/)
    .map(block => block.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const chapters = [];
  let current = { title: 'INTRODUCTION', paragraphs: [] };
  let inContents = false;

  for (const block of blocks) {
    if (/^contents$/i.test(block)) {
      inContents = true;
      continue;
    }

    if (inContents) {
      if (isChapterHeading(block) || /^[IVXLCDM]+\.\s+[A-Z]/.test(block)) {
        inContents = false;
      } else {
        continue;
      }
    }

    if (isChapterHeading(block)) {
      if (current.paragraphs.length) chapters.push(current);
      current = { title: block, paragraphs: [] };
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
    alert('The book text is unavailable.');
    return;
  }

  const chapters = buildBook(text);
  if (!chapters.length) {
    alert('No readable text was found in this book.');
    return;
  }

  let darkMode = false;
  let renderedPages = [];
  let scrollSave = 0;
  const progress = savedProgress(book.id);

  const container = document.createElement('div');
  container.className = 'reader-overlay';
  container.innerHTML = `
    <div class="reader-window">
      <header class="book-toolbar">
        <button class="reader-close" type="button" aria-label="Close">×</button>
        <div class="toolbar-title">${escapeHTML(book.title)}</div>
        <div class="toolbar-actions">
          <button class="reader-contents" type="button">Contents</button>
          <button class="reader-theme" type="button" aria-label="Change theme">◐</button>
        </div>
      </header>
      <div class="reader-progress"><span></span></div>
      <main class="reader-content">
        <article class="reader-book"></article>
      </main>
      <aside class="contents-panel" hidden>
        <div class="contents-header">
          <h2>Chapter Contents</h2>
          <button class="contents-close" type="button" aria-label="Close contents">×</button>
        </div>
        <nav class="contents-list"></nav>
      </aside>
    </div>
  `;

  document.body.appendChild(container);

  const contentArea = container.querySelector('.reader-content');
  const bookArea = container.querySelector('.reader-book');
  const contentsPanel = container.querySelector('.contents-panel');
  const contentsList = container.querySelector('.contents-list');
  const progressBar = container.querySelector('.reader-progress span');

  function renderBook() {
    const pages = [];
    const toc = [];
    let number = 0;
    const maxChars = 1050;

    chapters.forEach(chapter => {
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
          toc.push({
            title: chapter.title,
            pageIndex: pages.length - 1,
            pageNumber: number
          });
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
          ${page.paragraphs.map(paragraph =>
            `<p>${escapeHTML(paragraph)}</p>`
          ).join('')}
        </div>
        <div class="page-number">— ${page.number} —</div>
      </section>
    `).join('');

    contentsList.innerHTML = toc.map(item => `
      <button class="toc-entry" type="button" data-index="${item.pageIndex}">
        <span>${escapeHTML(item.title)}</span>
        <span class="toc-page-number">${item.pageNumber}</span>
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
  }

  function updateProgress() {
    const max = contentArea.scrollHeight - contentArea.clientHeight;
    const percent = max > 0 ? (contentArea.scrollTop / max) * 100 : 0;
    progressBar.style.width = `${percent}%`;
    saveProgress(book.id, contentArea.scrollTop);
  }

  function persistReadingPosition() {
    saveProgress(book.id, contentArea.scrollTop);
  }

  contentArea.addEventListener('scroll', () => {
    if (!scrollSave) {
      scrollSave = requestAnimationFrame(() => {
        updateProgress();
        scrollSave = 0;
      });
    }
  });

  function close() {
    persistReadingPosition();
    document.removeEventListener('keydown', keyboardHandler);
    document.removeEventListener('visibilitychange', visibilityHandler);
    window.removeEventListener('pagehide', persistReadingPosition);
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

  function visibilityHandler() {
    if (document.hidden) persistReadingPosition();
  }

  container.querySelector('.reader-close').addEventListener('click', close);

  container.querySelector('.reader-contents').addEventListener('click', () => {
    contentsPanel.hidden = !contentsPanel.hidden;
  });

  container.querySelector('.contents-close').addEventListener('click', () => {
    contentsPanel.hidden = true;
  });

  container.querySelector('.reader-theme').addEventListener('click', () => {
    darkMode = !darkMode;
    container.classList.toggle('reader-dark-paper', darkMode);
  });

  document.addEventListener('keydown', keyboardHandler);
  document.addEventListener('visibilitychange', visibilityHandler);
  window.addEventListener('pagehide', persistReadingPosition);

  renderBook();

  requestAnimationFrame(() => {
    contentArea.scrollTop = progress.enScroll || 0;
    updateProgress();
  });
}

export function openPdfReader({ book, file }) {
  if (!book || !file) {
    alert('No file was selected.');
    return;
  }

  const isPdf = file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');

  if (!isPdf) {
    alert('The selected file is not a PDF.');
    return;
  }

  const pdfUrl = URL.createObjectURL(file);
  const container = document.createElement('div');
  container.className = 'reader-overlay';

  container.innerHTML = `
    <div class="reader-window">
      <header class="book-toolbar">
        <button class="reader-close" type="button" aria-label="Close">×</button>
        <div class="toolbar-title">${escapeHTML(book.title)}</div>
        <div class="toolbar-actions"><span>PDF</span></div>
      </header>
      <main class="reader-content pdf-reader-content">
        <iframe
          class="pdf-frame"
          title="PDF Reader"
          src="${pdfUrl}"
          style="width:100%;height:100%;min-height:70vh;border:0;background:#fff"
        ></iframe>
      </main>
    </div>
  `;

  document.body.appendChild(container);

  function closePdf() {
    container.remove();
    URL.revokeObjectURL(pdfUrl);
    document.removeEventListener('keydown', keyboardHandler);
  }

  function keyboardHandler(event) {
    if (event.key === 'Escape') closePdf();
  }

  container.querySelector('.reader-close').addEventListener('click', closePdf);
  document.addEventListener('keydown', keyboardHandler);
}
