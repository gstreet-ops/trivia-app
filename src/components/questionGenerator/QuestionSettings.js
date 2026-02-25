import React from 'react';
import { computeEqualSplit } from './PromptBuilder';

const CATEGORIES = [
  'General Knowledge',
  'Film',
  'Music',
  'Geography',
  'History',
  'Sports',
  'Science & Nature',
  'Arts & Literature',
  'Custom',
];

const COUNT_OPTIONS = [10, 20, 30, 60];

function QuestionSettings({ settings, onSettingsChange, onBack, onNext }) {
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

  const update = (patch) => onSettingsChange({ ...settings, ...patch });

  // Equal split display
  const equalSplit = computeEqualSplit(questionCount);

  // Custom split validation
  const customTotal = easyCount + mediumCount + hardCount;
  const splitValid = difficultySplit === 'equal' || customTotal === questionCount;

  // When switching to custom, initialize with equal split values
  const handleDifficultyToggle = (mode) => {
    if (mode === 'custom' && difficultySplit !== 'custom') {
      const split = computeEqualSplit(questionCount);
      update({ difficultySplit: 'custom', easyCount: split.easy, mediumCount: split.medium, hardCount: split.hard });
    } else {
      update({ difficultySplit: mode });
    }
  };

  // When count changes, reset custom split to equal
  const handleCountChange = (count) => {
    const split = computeEqualSplit(count);
    update({
      questionCount: count,
      easyCount: split.easy,
      mediumCount: split.medium,
      hardCount: split.hard,
    });
  };

  return (
    <div className="qg-step">
      <h3 className="qg-step-title">Question Settings</h3>
      <p className="qg-step-desc">Configure how your questions should be generated.</p>

      <div className="qg-form">
        {/* Category */}
        <div className="qg-field">
          <label className="qg-label">Category</label>
          <select
            className="qg-input qg-select"
            value={category}
            onChange={(e) => update({ category: e.target.value, customCategory: '' })}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {category === 'Custom' && (
            <input
              className="qg-input"
              type="text"
              placeholder="Enter custom category name"
              value={customCategory}
              onChange={(e) => update({ customCategory: e.target.value })}
              style={{ marginTop: 8 }}
            />
          )}
        </div>

        {/* Question Count */}
        <div className="qg-field">
          <label className="qg-label">Number of Questions</label>
          <div className="qg-pill-group">
            {COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={`qg-pill${questionCount === n ? ' qg-pill--active' : ''}`}
                onClick={() => handleCountChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Split */}
        <div className="qg-field">
          <label className="qg-label">Difficulty Distribution</label>
          <div className="qg-toggle-row">
            <button
              type="button"
              className={`qg-toggle-btn${difficultySplit === 'equal' ? ' qg-toggle-btn--active' : ''}`}
              onClick={() => handleDifficultyToggle('equal')}
            >
              Equal
            </button>
            <button
              type="button"
              className={`qg-toggle-btn${difficultySplit === 'custom' ? ' qg-toggle-btn--active' : ''}`}
              onClick={() => handleDifficultyToggle('custom')}
            >
              Custom
            </button>
          </div>

          {difficultySplit === 'equal' ? (
            <div className="qg-equal-split-display">
              {equalSplit.easy} Easy / {equalSplit.medium} Medium / {equalSplit.hard} Hard
            </div>
          ) : (
            <div className="qg-custom-split">
              {[
                { key: 'easyCount', label: 'Easy' },
                { key: 'mediumCount', label: 'Medium' },
                { key: 'hardCount', label: 'Hard' },
              ].map(({ key, label }) => (
                <div className="qg-split-input" key={key}>
                  <label className="qg-split-label">{label}</label>
                  <input
                    className="qg-input qg-input--small"
                    type="number"
                    min={0}
                    max={questionCount}
                    value={settings[key]}
                    onChange={(e) => update({ [key]: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  />
                </div>
              ))}
              <span className={`qg-split-total${customTotal !== questionCount ? ' qg-split-total--error' : ''}`}>
                Total: {customTotal} / {questionCount}
              </span>
            </div>
          )}
        </div>

        {/* Include Explanations */}
        <div className="qg-field">
          <label className="qg-label">Include Explanations</label>
          <div className="qg-toggle-row">
            <button
              type="button"
              className={`qg-toggle-btn${includeExplanations ? ' qg-toggle-btn--active' : ''}`}
              onClick={() => update({ includeExplanations: true })}
            >
              On
            </button>
            <button
              type="button"
              className={`qg-toggle-btn${!includeExplanations ? ' qg-toggle-btn--active' : ''}`}
              onClick={() => update({ includeExplanations: false })}
            >
              Off
            </button>
          </div>
          <span className="qg-hint">Each question will include a 1-2 sentence explanation of the correct answer.</span>
        </div>

        {/* Additional Instructions */}
        <div className="qg-field">
          <label className="qg-label">Additional Instructions</label>
          <textarea
            className="qg-textarea"
            rows={3}
            placeholder="e.g., Avoid questions about dates, include humor, focus on lesser-known facts..."
            value={additionalInstructions}
            onChange={(e) => update({ additionalInstructions: e.target.value })}
          />
        </div>
      </div>

      <div className="qg-nav-buttons">
        <button className="qg-btn qg-btn--secondary" onClick={onBack} type="button">
          {'\u2190'} Back
        </button>
        <button
          className="qg-btn qg-btn--primary"
          onClick={onNext}
          disabled={!splitValid || (category === 'Custom' && !customCategory.trim())}
          type="button"
        >
          Generate Prompt {'\u2192'}
        </button>
      </div>
    </div>
  );
}

export default QuestionSettings;
