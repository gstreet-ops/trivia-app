import React from 'react';

const COUNT_OPTIONS = [10, 20, 30, 60];

function QuestionSettings({
  count,
  onCountChange,
  category,
  onCategoryChange,
  difficultyMode,
  onDifficultyModeChange,
  customSplit,
  onCustomSplitChange,
  extras,
  onExtrasChange,
  onBack,
  onNext,
}) {
  const handleSplitChange = (key, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    onCustomSplitChange({ ...customSplit, [key]: num });
  };

  const customTotal = customSplit.easy + customSplit.medium + customSplit.hard;
  const splitValid = difficultyMode === 'equal' || customTotal === count;

  return (
    <div className="qg-step">
      <h3 className="qg-step-title">Step 3: Question Settings</h3>
      <p className="qg-step-desc">Configure how your questions should be generated.</p>

      <div className="qg-form">
        {/* Question Count */}
        <div className="qg-field">
          <label className="qg-label">Number of Questions</label>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            {COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={`qg-count-btn ${count === n ? 'qg-count-btn--active' : ''}`}
                onClick={() => onCountChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Category Override */}
        <div className="qg-field">
          <label className="qg-label">Category Override (optional)</label>
          <input
            className="qg-input"
            type="text"
            placeholder="Leave blank to let the AI assign categories"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
          />
          <span className="qg-hint">If set, all questions will use this category.</span>
        </div>

        {/* Difficulty Mode */}
        <div className="qg-field">
          <label className="qg-label">Difficulty Distribution</label>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <button
              type="button"
              className={`qg-toggle-btn ${difficultyMode === 'equal' ? 'qg-toggle-btn--active' : ''}`}
              onClick={() => onDifficultyModeChange('equal')}
            >
              Equal Split
            </button>
            <button
              type="button"
              className={`qg-toggle-btn ${difficultyMode === 'custom' ? 'qg-toggle-btn--active' : ''}`}
              onClick={() => onDifficultyModeChange('custom')}
            >
              Custom
            </button>
          </div>

          {difficultyMode === 'custom' && (
            <div className="qg-custom-split">
              {['easy', 'medium', 'hard'].map((level) => (
                <div className="qg-split-input" key={level}>
                  <label className="qg-split-label">{level.charAt(0).toUpperCase() + level.slice(1)}</label>
                  <input
                    className="qg-input qg-input--small"
                    type="number"
                    min={0}
                    max={count}
                    value={customSplit[level]}
                    onChange={(e) => handleSplitChange(level, e.target.value)}
                  />
                </div>
              ))}
              <span className={`qg-split-total ${customTotal !== count ? 'qg-split-total--error' : ''}`}>
                Total: {customTotal}/{count}
              </span>
            </div>
          )}
        </div>

        {/* Extra Instructions */}
        <div className="qg-field">
          <label className="qg-label">Additional Instructions (optional)</label>
          <textarea
            className="qg-textarea"
            rows={3}
            placeholder="e.g. Avoid questions about dates, include humor, focus on lesser-known facts..."
            value={extras}
            onChange={(e) => onExtrasChange(e.target.value)}
          />
        </div>
      </div>

      <div className="qg-nav-buttons">
        <button className="qg-btn qg-btn--secondary" onClick={onBack} type="button">
          ← Back
        </button>
        <button
          className="qg-btn qg-btn--primary"
          onClick={onNext}
          disabled={!splitValid}
          type="button"
        >
          Generate Prompt →
        </button>
      </div>
    </div>
  );
}

export default QuestionSettings;
