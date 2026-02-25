import React from 'react';
import QuestionGeneratorCore from './QuestionGeneratorCore';

export default function CommissionerGenerator({ onClose, onOpenImport }) {
  return (
    <div className="commissioner-generator">
      <div className="qg-generator-header">
        <button onClick={onClose} className="qg-back-link" type="button">{'\u2190'} Back to Questions</button>
        <h2 className="qg-header-title">Question Generator</h2>
        <p className="qg-generator-subtitle">Create AI-powered prompts to generate trivia questions from any source</p>
      </div>
      <QuestionGeneratorCore mode="commissioner" onUploadCSV={onOpenImport} />
    </div>
  );
}
