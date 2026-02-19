/**
 * Decodes HTML entities (e.g. &amp; &#039; &quot; &lt; &gt;) into plain text.
 * Uses a hidden textarea for browser-native decoding — safe, no dangerouslySetInnerHTML.
 * Returns an empty string if input is null or undefined.
 */
const decodeHtml = (str) => {
  if (str == null) return '';
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
};

export default decodeHtml;
