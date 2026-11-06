import catalog from './catalog.json';

const asset = path => path ? `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}` : null;

export const books = catalog.filter(item => item.is_published !== false).map(item => ({
  id: item.id,
  title: item.title,
  titleAr: item.title_ar,
  originalTitle: undefined,
  author: item.author,
  authorAr: item.author_ar,
  category: item.category,
  cover: asset(item.cover),
  rating: item.rating,
  ratingCount: item.rating_count,
  ratingVerified: item.rating_verified,
  ratingCheckedAt: item.rating_checked_at,
  ratingSourceUrl: item.rating_source_url,
  year: item.year,
  description: item.description,
  source: item.source,
  sourceUrl: item.source_url,
  textUrl: asset(item.text_url),
  externalReadUrl: item.external_read_url,
  arabicTextUrl: asset(item.arabic_text_url),
  language: item.language,
  rightsVerified: item.rights_verified,
  licenseNote: item.license_note
}));
