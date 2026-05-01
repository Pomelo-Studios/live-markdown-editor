export function slugify(text) {
  return text
    .replace(/<[^>]+>/g, '')   // strip HTML tags
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')  // remove special chars
    .trim()
    .replace(/\s+/g, '-')
}
