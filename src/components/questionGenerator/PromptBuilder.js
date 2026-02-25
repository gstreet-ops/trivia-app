/**
 * PromptBuilder.js — Pure utility, no UI
 * Builds AI prompt strings for trivia question generation.
 * Supports Phase 2 super-admin mode via the `mode` parameter.
 */

const SOURCE_TYPES = {
  general: {
    key: 'general',
    label: 'General Knowledge',
    emoji: '🌐',
    description: 'Any topic — AI picks the best sources',
    mode: 'ai-accessible',
    fields: [
      { name: 'topic', label: 'Topic or Theme', type: 'text', placeholder: 'e.g. Ancient Rome, 90s Pop Music, Space Exploration', required: true },
      { name: 'focusArea', label: 'Focus Area (optional)', type: 'text', placeholder: 'e.g. battles, one-hit wonders, Mars missions' },
    ],
  },
  url: {
    key: 'url',
    label: 'Webpage / Article',
    emoji: '🔗',
    description: 'Generate from a specific URL',
    mode: 'ai-accessible',
    fields: [
      { name: 'url', label: 'URL', type: 'url', placeholder: 'https://en.wikipedia.org/wiki/...', required: true },
      { name: 'focusArea', label: 'Focus Area (optional)', type: 'text', placeholder: 'e.g. specific section or topic within the page' },
    ],
  },
  video: {
    key: 'video',
    label: 'YouTube Video',
    emoji: '🎥',
    description: 'Questions from a YouTube video',
    mode: 'ai-accessible',
    fields: [
      { name: 'url', label: 'YouTube URL', type: 'url', placeholder: 'https://www.youtube.com/watch?v=...', required: true },
      { name: 'focusArea', label: 'Focus Area (optional)', type: 'text', placeholder: 'e.g. key moments, specific topics discussed' },
    ],
  },
  document: {
    key: 'document',
    label: 'Paste Document',
    emoji: '📄',
    description: 'Paste text from a PDF, article, or notes',
    mode: 'paste-assisted',
    fields: [
      { name: 'title', label: 'Document Title', type: 'text', placeholder: 'e.g. Chapter 5 — The Renaissance', required: true },
      { name: 'content', label: 'Paste Content', type: 'textarea', placeholder: 'Paste the document text here...', required: true },
    ],
  },
  data: {
    key: 'data',
    label: 'Data / Stats',
    emoji: '📊',
    description: 'Paste tables, stats, or structured data',
    mode: 'paste-assisted',
    fields: [
      { name: 'title', label: 'Data Source Title', type: 'text', placeholder: 'e.g. 2024 NFL Season Stats', required: true },
      { name: 'content', label: 'Paste Data', type: 'textarea', placeholder: 'Paste CSV, table, or stats here...', required: true },
    ],
  },
  custom: {
    key: 'custom',
    label: 'Custom Prompt',
    emoji: '📝',
    description: 'Write your own instructions for the AI',
    mode: 'ai-accessible',
    fields: [
      { name: 'instructions', label: 'Your Instructions', type: 'textarea', placeholder: 'Describe exactly what kind of questions you want...', required: true },
    ],
  },
  social: {
    key: 'social',
    label: 'Social / Trending',
    emoji: '📱',
    description: 'Current events, memes, and trending topics',
    mode: 'ai-accessible',
    fields: [
      { name: 'topic', label: 'Topic or Trend', type: 'text', placeholder: 'e.g. viral TikTok trends, recent Grammy winners', required: true },
      { name: 'timeframe', label: 'Timeframe (optional)', type: 'text', placeholder: 'e.g. last 30 days, February 2026' },
    ],
  },
};

/**
 * Build difficulty instruction string.
 * @param {'equal'|'custom'} difficultyMode
 * @param {{ easy: number, medium: number, hard: number }} customSplit
 * @param {number} count
 */
function buildDifficultyString(difficultyMode, customSplit, count) {
  if (difficultyMode === 'custom') {
    return `Difficulty distribution: ${customSplit.easy} easy, ${customSplit.medium} medium, ${customSplit.hard} hard.`;
  }
  // Equal split
  const base = Math.floor(count / 3);
  let remainder = count - base * 3;
  let easy = base;
  let medium = base;
  let hard = base;
  if (remainder > 0) { easy++; remainder--; }
  if (remainder > 0) { medium++; }
  return `Difficulty distribution: ${easy} easy, ${medium} medium, ${hard} hard.`;
}

/**
 * Build the CSV format instruction block.
 */
function buildFormatBlock() {
  return [
    'Format each question as a CSV row with these columns:',
    'question,correct_answer,wrong1,wrong2,wrong3,category,difficulty',
    '',
    'Rules:',
    '- One question per line, no header row',
    '- Wrap any field containing commas in double quotes',
    '- difficulty must be: easy, medium, or hard',
    '- category should be a short label (e.g. "History", "Science", "Pop Culture")',
    '- All 3 wrong answers must be plausible but clearly incorrect',
    '- Do not number the questions',
  ].join('\n');
}

/**
 * Main prompt builder.
 * @param {object} params
 * @param {string} params.sourceType - key from SOURCE_TYPES
 * @param {object} params.sourceInput - field values from SourceInput
 * @param {number} params.count - question count
 * @param {string} params.category - optional category override
 * @param {'equal'|'custom'} params.difficultyMode
 * @param {{ easy: number, medium: number, hard: number }} params.customSplit
 * @param {string} params.extras - optional extra instructions
 * @param {'commissioner'|'admin'} [params.mode='commissioner']
 */
function buildPrompt(params) {
  const {
    sourceType,
    sourceInput = {},
    count = 10,
    category = '',
    difficultyMode = 'equal',
    customSplit = { easy: 0, medium: 0, hard: 0 },
    extras = '',
  } = params;

  const src = SOURCE_TYPES[sourceType];
  if (!src) return { prompt: '', instructions: [], postSteps: [] };

  const lines = [];
  const instructions = [];
  const postSteps = [];

  // Header
  lines.push(`Generate ${count} multiple-choice trivia questions.`);
  lines.push('');

  // Source-specific section
  switch (sourceType) {
    case 'general':
      lines.push(`Topic: ${sourceInput.topic || 'General Knowledge'}`);
      if (sourceInput.focusArea) lines.push(`Focus area: ${sourceInput.focusArea}`);
      break;
    case 'url':
      lines.push(`Source URL: ${sourceInput.url || ''}`);
      if (sourceInput.focusArea) lines.push(`Focus area: ${sourceInput.focusArea}`);
      instructions.push('Paste this prompt into your AI tool — it will read the URL directly.');
      break;
    case 'video':
      lines.push(`YouTube video: ${sourceInput.url || ''}`);
      if (sourceInput.focusArea) lines.push(`Focus area: ${sourceInput.focusArea}`);
      instructions.push('Paste this prompt into an AI tool that supports YouTube (e.g. ChatGPT, Gemini).');
      break;
    case 'document':
      lines.push(`Source document: "${sourceInput.title || 'Untitled'}"`);
      lines.push('Base all questions on the content provided below.');
      break;
    case 'data':
      lines.push(`Data source: "${sourceInput.title || 'Untitled'}"`);
      lines.push('Base all questions on the data/statistics provided below.');
      break;
    case 'custom':
      lines.push('Custom instructions:');
      lines.push(sourceInput.instructions || '');
      break;
    case 'social':
      lines.push(`Trending topic: ${sourceInput.topic || ''}`);
      if (sourceInput.timeframe) lines.push(`Timeframe: ${sourceInput.timeframe}`);
      instructions.push('Best with AI tools that have internet access for current information.');
      break;
    default:
      break;
  }

  lines.push('');

  // Category override
  if (category) {
    lines.push(`Use "${category}" as the category for all questions.`);
  }

  // Difficulty
  lines.push(buildDifficultyString(difficultyMode, customSplit, count));
  lines.push('');

  // Format block
  lines.push(buildFormatBlock());

  // Extra instructions
  if (extras && extras.trim()) {
    lines.push('');
    lines.push(`Additional instructions: ${extras.trim()}`);
  }

  // Paste-assisted content appended at the end
  if (src.mode === 'paste-assisted' && sourceInput.content) {
    lines.push('');
    lines.push('--- BEGIN CONTENT ---');
    lines.push(sourceInput.content);
    lines.push('--- END CONTENT ---');
  }

  // Build instructions and post-steps based on source mode
  if (src.mode === 'ai-accessible') {
    if (!instructions.length) {
      instructions.push('Copy the prompt below and paste it into your preferred AI tool (ChatGPT, Claude, Gemini, etc.).');
    }
    postSteps.push('Copy the CSV output from the AI response.');
    postSteps.push('Go to Questions → Import CSV and paste the data.');
    postSteps.push('Review the preview and confirm the import.');
  } else {
    instructions.push('This prompt includes your pasted content. Copy the entire prompt (including the content at the bottom) and paste it into your AI tool.');
    postSteps.push('Copy the CSV output from the AI response.');
    postSteps.push('Go to Questions → Import CSV and paste the data.');
    postSteps.push('Review the preview and confirm the import.');
  }

  return {
    prompt: lines.join('\n'),
    instructions,
    postSteps,
  };
}

export { SOURCE_TYPES, buildPrompt };
