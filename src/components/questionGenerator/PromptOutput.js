import React, { useState } from 'react';

function PromptOutput({ prompt, instructions, postSteps, onGenerateAnother, onBackToSettings }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = prompt;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="qg-step">
      <h3 className="qg-step-title">Your Prompt is Ready</h3>

      {/* Section 1 — How to Use This Prompt */}
      {instructions.length > 0 && (
        <div className="qg-instructions">
          <h4 className="qg-instructions-title">How to Use This Prompt</h4>
          <ol className="qg-instructions-list">
            {instructions.map((inst, i) => (
              <li key={i}>{inst}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Section 2 — Your Generated Prompt */}
      <div className="qg-prompt-box">
        <div className="qg-prompt-header">
          <span className="qg-prompt-label">Your Generated Prompt</span>
          <button
            className={`qg-btn qg-btn--copy${copied ? ' qg-btn--copied' : ''}`}
            onClick={handleCopy}
            type="button"
          >
            {copied ? '\u2713 Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="qg-prompt-text">{prompt}</pre>
      </div>

      {/* Section 3 — After You Get Results */}
      {postSteps.length > 0 && (
        <div className="qg-post-steps">
          <h4 className="qg-post-steps-title">After You Get Results</h4>
          <ol className="qg-post-steps-list">
            {postSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Bottom actions */}
      <div className="qg-nav-buttons">
        <button className="qg-btn qg-btn--secondary" onClick={onBackToSettings} type="button">
          {'\u2190'} Back to Settings
        </button>
        <button className="qg-btn qg-btn--secondary" onClick={onGenerateAnother} type="button">
          {'\u2190'} Generate Another
        </button>
      </div>
    </div>
  );
}

export default PromptOutput;
