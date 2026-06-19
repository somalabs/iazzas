const IMAGE_MARKDOWN = /!\[[^\]]*\]\([^)]*\)/g;
const LINK_MARKDOWN = /\[([^\]]*)\]\([^)]*\)/g;
const INLINE_TOKENS = /[#*_>`~]/g;
const LIST_MARKER = /^\s*[-+]\s+/gm;

/**
 * Plain-text preview of a recado for list rows: drops image markdown, keeps link
 * text, strips inline markdown tokens, and falls back to an image label when the
 * recado has no readable text (e.g. an image-only recado).
 */
export const recadoSnippet = (message: string, imageLabel: string): string => {
  const hasImage = IMAGE_MARKDOWN.test(message);
  IMAGE_MARKDOWN.lastIndex = 0;

  const firstLine = message
    .replace(IMAGE_MARKDOWN, ' ')
    .replace(LINK_MARKDOWN, '$1')
    .replace(INLINE_TOKENS, '')
    .replace(LIST_MARKER, '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return hasImage ? imageLabel : '';
  }

  return firstLine.length > 90 ? `${firstLine.slice(0, 90)}…` : firstLine;
};
