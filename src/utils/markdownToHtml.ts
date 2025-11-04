/**
 * Converte Markdown simples para HTML
 * Suporta: **negrito**, *itálico*, quebras de linha
 */
export const parseSimpleMarkdown = (text: string): string => {
  if (!text) return '';

  let html = text;

  // Escapar HTML perigoso primeiro (XSS protection)
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Converter **negrito** para <strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Converter *itálico* para <em>
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Converter quebras de linha duplas em parágrafos
  html = html.replace(/\n\n/g, '</p><p>');

  // Envolver em parágrafo se não começar com um
  if (!html.startsWith('<p>')) {
    html = '<p>' + html + '</p>';
  }

  return html;
};
