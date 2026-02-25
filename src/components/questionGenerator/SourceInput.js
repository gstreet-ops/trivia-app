import React from 'react';
import { getSourceById } from './PromptBuilder';

const PLATFORMS = ['Twitter/X', 'Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'Other'];

/**
 * Field definitions per source type.
 * Each entry has: name, label, type, placeholder, required, rows (for textarea)
 * Special entries with type='info' render as helper text blocks.
 */
const SOURCE_FIELDS = {
  'web-search': [
    { name: 'topic', label: 'Topic', type: 'text', placeholder: 'e.g., Medieval European History', required: true },
    { name: 'focusArea', label: 'Focus Areas', type: 'text', placeholder: 'e.g., key battles, political systems, major figures' },
  ],
  'website': [
    { name: 'url', label: 'URL', type: 'url', placeholder: 'https://example.com/article', required: true },
    { name: 'focusArea', label: 'Focus On', type: 'text', placeholder: 'e.g., specific section or topic within the page' },
  ],
  'youtube': [
    { name: 'url', label: 'Video URL', type: 'url', placeholder: 'https://youtube.com/watch?v=...', required: true },
    { name: 'focusArea', label: 'Focus On', type: 'text', placeholder: 'e.g., key moments, specific topics discussed' },
  ],
  'document': [
    { type: 'info', text: 'Paste content here for reference, or upload directly to your AI chat.' },
    { name: 'content', label: 'Content', type: 'textarea', placeholder: 'Paste your document text here...', rows: 8 },
    { name: 'contextHint', label: 'What is this about?', type: 'text', placeholder: 'e.g., Chapter 5 — The Renaissance' },
  ],
  'data-file': [
    { type: 'info', text: 'Upload your spreadsheet/CSV directly to the AI chat with the prompt.' },
    { name: 'dataDescription', label: 'What does this data contain?', type: 'text', placeholder: 'e.g., 2024 NFL Season Stats' },
  ],
  'study-notes': [
    { type: 'info', text: 'Paste notes here, or upload directly to your AI chat.' },
    { name: 'content', label: 'Content', type: 'textarea', placeholder: 'Paste your notes or outline here...', rows: 8 },
    { name: 'contextHint', label: 'Course or Subject', type: 'text', placeholder: 'e.g., AP Biology, Intro to Economics' },
  ],
  'social-media': [
    { name: 'platform', label: 'Platform', type: 'select', options: PLATFORMS, required: true },
    { name: 'accountName', label: 'Account/Page Name', type: 'text', placeholder: 'e.g., @nytimes', required: true },
    { type: 'info', text: 'Copy 15-20 posts and paste below, or paste directly into AI chat.' },
    { name: 'content', label: 'Pasted Content', type: 'textarea', placeholder: 'Paste social media posts here...', rows: 8 },
  ],
};

function SourceInput({ sourceType, values, onChange, onBack, onNext }) {
  const src = getSourceById(sourceType);
  if (!src) return null;

  const fields = SOURCE_FIELDS[sourceType] || [];

  // Check required fields are filled
  const isValid = fields
    .filter(f => f.required && f.type !== 'info')
    .every(f => values[f.name] && values[f.name].trim());

  const handleChange = (name, value) => {
    onChange({ ...values, [name]: value });
  };

  const modeTip = src.mode === 'ai-accessible'
    ? '\u{1F4A1} The AI will access this content directly \u2014 just paste the prompt.'
    : '\u{1F4A1} Upload your content to the AI chat first, then paste the prompt.';

  return (
    <div className="qg-step">
      <h3 className="qg-step-title">{src.icon} {src.label} Details</h3>
      <div className="qg-mode-tip">{modeTip}</div>

      <div className="qg-form">
        {fields.map((field, i) => {
          if (field.type === 'info') {
            return (
              <div className="qg-info-block" key={`info-${i}`}>
                {field.text}
              </div>
            );
          }

          if (field.type === 'select') {
            return (
              <div className="qg-field" key={field.name}>
                <label className="qg-label">
                  {field.label}
                  {field.required && <span className="qg-required">*</span>}
                </label>
                <select
                  className="qg-input qg-select"
                  value={values[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                >
                  <option value="">Select a platform...</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            );
          }

          if (field.type === 'textarea') {
            return (
              <div className="qg-field" key={field.name}>
                <label className="qg-label">
                  {field.label}
                  {field.required && <span className="qg-required">*</span>}
                </label>
                <textarea
                  className="qg-textarea"
                  placeholder={field.placeholder}
                  value={values[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  rows={field.rows || 4}
                />
              </div>
            );
          }

          return (
            <div className="qg-field" key={field.name}>
              <label className="qg-label">
                {field.label}
                {field.required && <span className="qg-required">*</span>}
              </label>
              <input
                className="qg-input"
                type={field.type === 'url' ? 'url' : 'text'}
                placeholder={field.placeholder}
                value={values[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            </div>
          );
        })}
      </div>

      <div className="qg-nav-buttons">
        <button className="qg-btn qg-btn--secondary" onClick={onBack} type="button">
          \u2190 Back
        </button>
        <button
          className="qg-btn qg-btn--primary"
          onClick={onNext}
          disabled={!isValid}
          type="button"
        >
          Next \u2192
        </button>
      </div>
    </div>
  );
}

export default SourceInput;
