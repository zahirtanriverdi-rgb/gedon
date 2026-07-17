// Azerbaijani-aware search folding: lowercases and maps the letters that differ between the
// Azerbaijani and basic Latin alphabets, so queries typed on EN/RU keyboards (or lazily,
// without diacritics) still match — "selale" finds "şəlalə", "cay" finds "çay".
export const normalizeAzText = (text: string): string => {
  return text.toLowerCase()
    .replace(/ə/g, 'e')
    .replace(/ö/g, 'o')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i');
};
