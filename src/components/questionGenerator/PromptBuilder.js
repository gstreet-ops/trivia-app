/**
 * PromptBuilder.js — Pure utility, no UI
 * Builds AI prompt strings for trivia question generation.
 * Zero API calls — only assembles prompt strings.
 */

const SOURCES = [
  { id: 'web-search', icon: '\u{1F310}', label: 'Web Search', description: 'Generate from any topic using AI web search', mode: 'ai-accessible' },
  { id: 'website', icon: '\u{1F517}', label: 'Website URL', description: 'Generate from a specific webpage', mode: 'ai-accessible' },
  { id: 'youtube', icon: '\u{1F3A5}', label: 'YouTube Video', description: 'Generate from video transcripts', mode: 'ai-accessible' },
  { id: 'document', icon: '\u{1F4C4}', label: 'Document / Text', description: 'Generate from pasted or uploaded document content', mode: 'paste-assisted' },
  { id: 'data-file', icon: '\u{1F4CA}', label: 'Spreadsheet / CSV', description: 'Transform existing data into questions', mode: 'paste-assisted' },
  { id: 'study-notes', icon: '\u{1F4DD}', label: 'Study Notes', description: 'Create questions from notes or outlines', mode: 'paste-assisted' },
  { id: 'social-media', icon: '\u{1F4F1}', label: 'Social Media', description: 'Generate from social media posts', mode: 'paste-assisted' },
];

function getSourceById(id) {
  return SOURCES.find(s => s.id === id) || null;
}

/**
 * Compute equal difficulty split: remainder to easy first, then medium.
 */
function computeEqualSplit(count) {
  const base = Math.floor(count / 3);
  let remainder = count - base * 3;
  let easy = base, medium = base, hard = base;
  if (remainder > 0) { easy++; remainder--; }
  if (remainder > 0) { medium++; }
  return { easy, medium, hard };
}

/**
 * Build the complete prompt.
 * @param {string} source - source id
 * @param {object} sourceInput - field values from SourceInput
 * @param {object} settings - from QuestionSettings
 * @returns {{ prompt: string, instructions: string[], postSteps: string[], sourceMode: string }}
 */
function buildPrompt(source, sourceInput, settings) {
  const src = getSourceById(source);
  if (!src) return { prompt: '', instructions: [], postSteps: [], sourceMode: 'ai-accessible' };

  const {
    category = 'General Knowledge',
    customCategory = '',
    questionCount = 20,
    difficultySplit = 'equal',
    easyCount = 0,
    mediumCount = 0,
    hardCount = 0,
    includeExplanations = true,
    additionalInstructions = '',
  } = settings;

  const count = questionCount;
  const categoryLabel = category === 'Custom' ? customCategory : category;

  // Compute difficulty counts
  let easy, medium, hard;
  if (difficultySplit === 'custom') {
    easy = easyCount;
    medium = mediumCount;
    hard = hardCount;
  } else {
    const split = computeEqualSplit(count);
    easy = split.easy;
    medium = split.medium;
    hard = split.hard;
  }

  const lines = [];

  // Prepend pasted content for paste-assisted sources that have content
  const hasPastedContent = src.mode === 'paste-assisted' && sourceInput.content && sourceInput.content.trim();
  if (hasPastedContent) {
    lines.push('--- BEGIN CONTENT ---');
    lines.push(sourceInput.content.trim());
    lines.push('--- END CONTENT ---');
    lines.push('');
  }

  // Source-specific opening
  switch (source) {
    case 'web-search':
      lines.push(`Search the web thoroughly on the topic of "${sourceInput.topic || ''}"${sourceInput.focusArea ? ` and focus specifically on: ${sourceInput.focusArea}` : ''}. Generate exactly ${count} multiple-choice trivia questions.`);
      break;
    case 'website':
      lines.push(`Go to this webpage and read its content: ${sourceInput.url || ''}`);
      if (sourceInput.focusArea) lines.push(`Focus specifically on: ${sourceInput.focusArea}`);
      lines.push(`Using the information from that page, generate exactly ${count} multiple-choice trivia questions.`);
      break;
    case 'youtube':
      lines.push(`Access this YouTube video and get its transcript: ${sourceInput.url || ''}`);
      if (sourceInput.focusArea) lines.push(`Focus specifically on: ${sourceInput.focusArea}`);
      lines.push(`Using the content from the video, generate exactly ${count} multiple-choice trivia questions.`);
      break;
    case 'document':
      lines.push(`Using the document content I have provided above, generate exactly ${count} multiple-choice trivia questions.`);
      if (sourceInput.contextHint) lines.push(`Context: This document is about ${sourceInput.contextHint}.`);
      break;
    case 'data-file':
      lines.push(`Using the spreadsheet/CSV data I have provided above${sourceInput.dataDescription ? ` (which contains: ${sourceInput.dataDescription})` : ''}, transform this information into exactly ${count} multiple-choice trivia questions. Create questions that test knowledge of the data's contents \u2014 don't just ask to recall specific cells, but create meaningful questions about patterns, facts, and relationships in the data.`);
      break;
    case 'study-notes':
      lines.push(`Using the study notes/outline I have provided above${sourceInput.contextHint ? ` for ${sourceInput.contextHint}` : ''}, create exactly ${count} multiple-choice trivia questions that effectively test understanding of this material. Easy questions should test basic recall. Medium questions should test understanding and application. Hard questions should test analysis, edge cases, and deeper concepts.`);
      break;
    case 'social-media':
      lines.push(`Using the ${sourceInput.platform || 'social media'} posts I have provided above from ${sourceInput.accountName || 'the account'}, generate exactly ${count} multiple-choice trivia questions based on the content, themes, and information shared in these posts.`);
      break;
    default:
      break;
  }

  lines.push('');

  // Difficulty line
  lines.push(`Difficulty distribution: ${easy} easy, ${medium} medium, ${hard} hard.`);
  lines.push('');

  // Category line
  lines.push(`Category for all questions: "${categoryLabel}".`);
  lines.push('');

  // Additional instructions
  if (additionalInstructions && additionalInstructions.trim()) {
    lines.push(`Additional requirements: ${additionalInstructions.trim()}`);
    lines.push('');
  }

  // CSV format block
  const csvHeaders = `question_text,correct_answer,incorrect_answer_1,incorrect_answer_2,incorrect_answer_3,category,difficulty${includeExplanations ? ',explanation' : ''},image_url,video_url`;
  lines.push('**Output format:**');
  lines.push(`Generate the results as a CSV with these exact headers:`);
  lines.push(csvHeaders);
  lines.push('');
  lines.push('Rules for the CSV:');
  lines.push('- Wrap ALL field values in double quotes');
  lines.push('- Escape any internal double quotes with two double quotes ("")');
  lines.push('- One question per line');
  lines.push('- No blank lines between questions');
  lines.push('- If possible, provide the CSV as a downloadable .csv file. Otherwise, output ONLY the raw CSV data (header row + data rows) inside a single code block with no other text, commentary, or markdown formatting before or after it.');
  if (includeExplanations) {
    lines.push('- The explanation should be 1-2 sentences explaining why the correct answer is right');
  }
  lines.push('- image_url and video_url are optional — leave empty unless a relevant image or YouTube video URL is directly available from the source material');
  lines.push('');

  // Quality block
  lines.push('**Quality requirements:**');
  lines.push('- Questions must be factually accurate and unambiguous');
  lines.push('- Each question must have exactly ONE clearly correct answer');
  lines.push('- All three wrong answers must be plausible and the same type/format as the correct answer');
  lines.push('- No "all of the above" or "none of the above" answers');
  lines.push('- Cover diverse subtopics within the source material');
  lines.push('- Easy = common knowledge, surface-level facts anyone familiar with the topic would know');
  lines.push('- Medium = requires solid familiarity with the topic');
  lines.push('- Hard = requires deep knowledge, specific details, or nuanced understanding');

  // Build instructions
  const instructions = [];
  if (src.mode === 'ai-accessible') {
    instructions.push('Open your preferred AI chat tool (Claude.ai, ChatGPT, Gemini, etc.)');
    instructions.push('Make sure web search or browsing is enabled if available');
    instructions.push('Paste the prompt below into the chat');
    instructions.push('Wait for the AI to generate all questions');
    instructions.push('Copy the CSV output from the response');
  } else if (hasPastedContent) {
    instructions.push('Open your preferred AI chat tool (Claude.ai, ChatGPT, Gemini, etc.)');
    instructions.push('Paste the prompt below \u2014 your content is already included');
    instructions.push('Wait for the AI to generate all questions');
    instructions.push('Copy the CSV output from the response');
  } else {
    instructions.push('Open your preferred AI chat tool (Claude.ai, ChatGPT, Gemini, etc.)');
    instructions.push('Upload your file or paste your content into the chat first');
    instructions.push('Then paste the prompt below into the same chat');
    instructions.push('Wait for the AI to generate all questions');
    instructions.push('Copy the CSV output from the response');
  }

  // Post-steps (same for all)
  const postSteps = [
    'Download the .csv file from the AI\'s response (or copy the CSV text)',
    'Click the \'Upload CSV Now\' button below to go directly to import',
    'Upload the file \u2014 questions will be validated and imported',
    'Review imported questions and add tags as needed',
  ];

  return {
    prompt: lines.join('\n'),
    instructions,
    postSteps,
    sourceMode: src.mode,
  };
}

export { SOURCES, getSourceById, computeEqualSplit, buildPrompt };
