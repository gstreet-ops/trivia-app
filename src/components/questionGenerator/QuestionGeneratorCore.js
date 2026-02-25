import React, { useState, useCallback } from 'react';
import SourceSelector from './SourceSelector';
import SourceInput from './SourceInput';
import QuestionSettings from './QuestionSettings';
import PromptOutput from './PromptOutput';
import { buildPrompt, computeEqualSplit } from './PromptBuilder';
import './QuestionGeneratorCore.css';

const STEP_LABELS = ['Source', 'Details', 'Settings', 'Generate'];

const INITIAL_SETTINGS = {
  category: 'General Knowledge',
  customCategory: '',
  questionCount: 20,
  difficultySplit: 'equal',
  easyCount: 7,
  mediumCount: 7,
  hardCount: 6,
  includeExplanations: true,
  additionalInstructions: '',
};

function QuestionGeneratorCore({ mode = 'commissioner', onUploadCSV }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [source, setSource] = useState(null);
  const [sourceInput, setSourceInput] = useState({});
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [output, setOutput] = useState(null);

  // Auto-advance from Step 1 to Step 2 on source select
  const handleSourceSelect = useCallback((id) => {
    setSource(id);
    setSourceInput({});
    setCurrentStep(2);
  }, []);

  // Generate prompt (Step 3 -> Step 4)
  const handleGenerate = useCallback(() => {
    const result = buildPrompt(source, sourceInput, settings);
    setOutput(result);
    setCurrentStep(4);
  }, [source, sourceInput, settings]);

  // Reset everything for "Generate Another"
  const handleReset = useCallback(() => {
    setCurrentStep(1);
    setSource(null);
    setSourceInput({});
    const split = computeEqualSplit(20);
    setSettings({
      ...INITIAL_SETTINGS,
      easyCount: split.easy,
      mediumCount: split.medium,
      hardCount: split.hard,
    });
    setOutput(null);
  }, []);

  return (
    <div className="qg-container">
      {/* Step indicator */}
      <div className="qg-steps-indicator">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isDone = stepNum < currentStep;
          return (
            <React.Fragment key={stepNum}>
              {i > 0 && (
                <div className={`qg-step-line${isDone ? ' qg-step-line--done' : ''}`} />
              )}
              <div className="qg-step-item">
                <div
                  className={`qg-step-circle${isActive ? ' qg-step-circle--active' : ''}${isDone ? ' qg-step-circle--done' : ''}`}
                >
                  {isDone ? '\u2713' : stepNum}
                </div>
                <span className={`qg-step-label${isActive ? ' qg-step-label--active' : ''}${isDone ? ' qg-step-label--done' : ''}`}>
                  {label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Step content */}
      {currentStep === 1 && (
        <SourceSelector selected={source} onSelect={handleSourceSelect} />
      )}

      {currentStep === 2 && (
        <SourceInput
          sourceType={source}
          values={sourceInput}
          onChange={setSourceInput}
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 3 && (
        <QuestionSettings
          settings={settings}
          onSettingsChange={setSettings}
          onBack={() => setCurrentStep(2)}
          onNext={handleGenerate}
        />
      )}

      {currentStep === 4 && output && (
        <PromptOutput
          prompt={output.prompt}
          instructions={output.instructions}
          postSteps={output.postSteps}
          onGenerateAnother={handleReset}
          onBackToSettings={() => setCurrentStep(3)}
          onUploadCSV={onUploadCSV}
        />
      )}
    </div>
  );
}

export default QuestionGeneratorCore;
