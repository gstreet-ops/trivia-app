import React from 'react';
import { SOURCE_TYPES } from './PromptBuilder';

function SourceInput({ sourceType, values, onChange, onBack, onNext }) {
  const src = SOURCE_TYPES[sourceType];
  if (!src) return null;

  const isValid = src.fields
    .filter((f) => f.required)
    .every((f) => values[f.name] && values[f.name].trim());

  const handleChange = (name, value) => {
    onChange({ ...values, [name]: value });
  };

  return (
    <div className="qg-step">
      <h3 className="qg-step-title">
        Step 2: {src.emoji} {src.label} Details
      </h3>
      <p className="qg-step-desc">Provide the details for your source.</p>

      <div className="qg-form">
        {src.fields.map((field) => (
          <div className="qg-field" key={field.name}>
            <label className="qg-label">
              {field.label}
              {field.required && <span className="qg-required">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                className="qg-textarea"
                placeholder={field.placeholder}
                value={values[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                rows={field.name === 'content' ? 8 : 4}
              />
            ) : (
              <input
                className="qg-input"
                type={field.type === 'url' ? 'url' : 'text'}
                placeholder={field.placeholder}
                value={values[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="qg-nav-buttons">
        <button className="qg-btn qg-btn--secondary" onClick={onBack} type="button">
          ← Back
        </button>
        <button
          className="qg-btn qg-btn--primary"
          onClick={onNext}
          disabled={!isValid}
          type="button"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default SourceInput;
