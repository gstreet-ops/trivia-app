import React from 'react';
import { SOURCE_TYPES } from './PromptBuilder';

const SOURCE_ORDER = ['general', 'url', 'video', 'document', 'data', 'custom', 'social'];

function SourceSelector({ selected, onSelect }) {
  return (
    <div className="qg-step">
      <h3 className="qg-step-title">Step 1: Choose a Source</h3>
      <p className="qg-step-desc">What will your questions be based on?</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '12px',
          marginTop: '16px',
        }}
      >
        {SOURCE_ORDER.map((key) => {
          const src = SOURCE_TYPES[key];
          return (
            <button
              key={key}
              className={`qg-source-card ${selected === key ? 'qg-source-card--active' : ''}`}
              onClick={() => onSelect(key)}
              type="button"
            >
              <span className="qg-source-emoji">{src.emoji}</span>
              <span className="qg-source-label">{src.label}</span>
              <span className="qg-source-desc">{src.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SourceSelector;
