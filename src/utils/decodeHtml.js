/**
 * Decodes HTML entities (e.g. &amp; &#039; &quot; &lt; &gt;) into plain text.
 * Uses DOMParser for browser-native decoding without innerHTML assignment.
 * Returns an empty string if input is null or undefined.
 */
const decodeHtml = (str) => {
  if (str == null) return '';
  return new DOMParser().parseFromString(str, 'text/html').body.textContent;
};

export default decodeHtml;
