
const GOOGLE_API = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_API = 'https://openlibrary.org/search.json';

const cache = new Map();

function normalizeGoogle(book) {
  const info = book.volumeInfo || {};
  const access = book.accessInfo || {};

  return {
    id: `google-${book.id}`,
    source: 'Google Books',
    title: info.title || 'عنوان غير معروف',
    author: (info.authors || ['مؤلف غير معروف']).join('، '),
    description: info.description || 'لا يوجد وصف متاح لهذا الكتاب.',
    publisher: info.publisher || 'غير محدد',
    published: info.publishedDate || 'غير محدد',
    pages: info.pageCount || null,
    language: info.language || '',
    category: (info.categories || ['غير مصنف']).join('، '),
    cover: (info.imageLinks?.thumbnail || '').replace('http://', 'https://'),
    preview: info.previewLink || '',
    infoLink: info.infoLink || '',
    pdfAvailable: access.pdf?.isAvailable || false,
    epubAvailable: access.epub?.isAvailable || false
  };
}

function normalizeOpen(book) {
  return {
    id: `open-${book.key || book.title}`,
    source: 'Open Library',
    title: book.title || 'عنوان غير معروف',
    author: (book.author_name || ['مؤلف غير معروف']).join('، '),
    description: 'بيانات الكتاب من Open Library.',
    publisher: (book.publisher || []).slice(0, 2).join('، ') || 'غير محدد',
    published: book.first_publish_year || 'غير محدد',
    pages: null,
    language: (book.language || [])[0] || '',
    category: (book.subject || ['غير مصنف']).slice(0, 2).join('، '),
    cover: book.cover_i
      ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
      : '',
    preview: book.key ? `https://openlibrary.org${book.key}` : '',
    infoLink: book.key ? `https://openlibrary.org${book.key}` : '',
    pdfAvailable: false,
    epubAvailable: false
  };
}

export async function searchBooks(query, page = 0) {
  const term = query.trim();

  if (!term) throw new Error('اكتب اسم كتاب أو مؤلف للبحث.');

  const cacheKey = `${term.toLowerCase()}-${page}`;

  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const url = new URL(GOOGLE_API);
  url.searchParams.set('q', term);
  url.searchParams.set('maxResults', '20');
  url.searchParams.set('startIndex', String(page * 20));
  url.searchParams.set('printType', 'books');
  url.searchParams.set('orderBy', 'relevance');

  let books = [];

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('تعذر الاتصال بمصدر Google Books.');
    }

    const data = await response.json();
    books = (data.items || []).map(normalizeGoogle);
  } catch (error) {
    console.warn('Google Books:', error.message);
  }

  // Open Library is used as a fallback when Google returns no results.
  if (!books.length) {
    const fallback = new URL(OPEN_API);
    fallback.searchParams.set('q', term);
    fallback.searchParams.set('limit', '20');
    fallback.searchParams.set('page', String(page + 1));
    fallback.searchParams.set(
      'fields',
      'key,title,author_name,first_publish_year,cover_i,language,subject,publisher'
    );

    try {
      const response = await fetch(fallback);

      if (!response.ok) {
        throw new Error('تعذر الاتصال بمكتبة Open Library.');
      }

      const data = await response.json();
      books = (data.docs || []).map(normalizeOpen);
    } catch (error) {
      console.error('Open Library:', error);
      throw new Error('تعذر الوصول إلى مصادر الكتب. تحقق من الإنترنت وحاول مجدداً.');
    }
  }

  cache.set(cacheKey, books);

  return books;
}

