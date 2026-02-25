import React from 'react';
import { SOURCES } from './PromptBuilder';

function SourceSelector({ selected, onSelect }) {
  return (
    <div className="qg-step">
      <h3 className="qg-step-title">Choose a Source</h3>
      <p className="qg-step-desc">What will your questions be based on?</p>
      <div className="qg-source-grid">
        {SOURCES.map((src) => (
          <button
            key={src.id}
            className={`qg-source-card${selected === src.id ? ' qg-source-card--active' : ''}`}
            onClick={() => onSelect(src.id)}
            type="button"
          >
            <span
              className={`qg-source-badge${src.mode === 'ai-accessible' ? ' qg-source-badge--ai' : ' qg-source-badge--paste'}`}
            >
              {src.mode === 'ai-accessible' ? 'AI-accessible' : 'Paste-assisted'}
            </span>
            <span className="qg-source-emoji">{src.icon}</span>
            <span className="qg-source-label">{src.label}</span>
            <span className="qg-source-desc">{src.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default SourceSelector;
