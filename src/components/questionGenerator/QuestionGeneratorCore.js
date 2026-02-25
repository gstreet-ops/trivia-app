import React, { useState, useCallback } from 'react';
import SourceSelector from './SourceSelector';
import SourceInput from './SourceInput';
import QuestionSettings from './QuestionSettings';
import PromptOutput from './PromptOutput';
import { buildPrompt } from './PromptBuilder';
import './QuestionGeneratorCore.css';

const TOTAL_STEPS = 4;

function QuestionGeneratorCore({ mode = 'commissioner', onClose }) {
  // Step tracking
  const [step, setStep] = useState(1);

  // Step 1: Source
  const [sourceType, setSourceType] = useState(null);

  // Step 2: Source input values
  const [sourceInput, setSourceInput] = useState({});

  // Step 3: Settings
  const [count, setCount] = useState(10);
  const [category, setCategory] = useState('');
  const [difficultyMode, setDifficultyMode] = useState('equal');
  const [customSplit, setCustomSplit] = useState({ easy: 4, medium: 3, hard: 3 });
  const [extras, setExtras] = useState('');

  // Step 4: Generated output
  const [output, setOutput] = useState(null);

  // Auto-advance from Step 1 to Step 2
  const handleSourceSelect = useCallback((key) => {
    setSourceType(key);
    setSourceInput({});
    setStep(2);
  }, []);

  // Generate prompt (Step 3 → Step 4)
  const handleGenerate = useCallback(() => {
    const result = buildPrompt({
      sourceType,
      sourceInput,
      count,
      category,
      difficultyMode,
      customSplit,
      extras,
      mode,
    });
    setOutput(result);
    setStep(4);
  }, [sourceType, sourceInput, count, category, difficultyMode, customSplit, extras, mode]);

  // Reset for "Generate Another"
  const handleReset = useCallback(() => {
    setStep(1);
    setSourceType(null);
    setSourceInput({});
    setCount(10);
    setCategory('');
    setDifficultyMode('equal');
    setCustomSplit({ easy: 4, medium: 3, hard: 3 });
    setExtras('');
    setOutput(null);
  }, []);

  // Recompute custom split when count changes
  const handleCountChange = useCallback((newCount) => {
    setCount(newCount);
    if (difficultyMode === 'custom') {
      const base = Math.floor(newCount / 3);
      let remainder = newCount - base * 3;
      let easy = base, medium = base, hard = base;
      if (remainder > 0) { easy++; remainder--; }
      if (remainder > 0) { medium++; }
      setCustomSplit({ easy, medium, hard });
    }
  }, [difficultyMode]);

  return (
    <div className="qg-container">
      {/* Header */}
      <div className="qg-header">
        <h2 className="qg-header-title">Question Generator</h2>
        <button className="qg-back-link" onClick={onClose} type="button">
          ← Back to Questions
        </button>
      </div>

      {/* Step indicator */}
      <div className="qg-steps-indicator">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const stepNum = i + 1;
          let cls = 'qg-step-dot';
          if (stepNum === step) cls += ' qg-step-dot--active';
          else if (stepNum < step) cls += ' qg-step-dot--done';
          return <div key={stepNum} className={cls} />;
        })}
      </div>

      {/* Steps */}
      {step === 1 && (
        <SourceSelector selected={sourceType} onSelect={handleSourceSelect} />
      )}

      {step === 2 && (
        <SourceInput
          sourceType={sourceType}
          values={sourceInput}
          onChange={setSourceInput}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <QuestionSettings
          count={count}
          onCountChange={handleCountChange}
          category={category}
          onCategoryChange={setCategory}
          difficultyMode={difficultyMode}
          onDifficultyModeChange={setDifficultyMode}
          customSplit={customSplit}
          onCustomSplitChange={setCustomSplit}
          extras={extras}
          onExtrasChange={setExtras}
          onBack={() => setStep(2)}
          onNext={handleGenerate}
        />
      )}

      {step === 4 && output && (
        <PromptOutput
          prompt={output.prompt}
          instructions={output.instructions}
          postSteps={output.postSteps}
          onGenerateAnother={handleReset}
          onBackToSettings={() => setStep(3)}
        />
      )}
    </div>
  );
}

export default QuestionGeneratorCore;
