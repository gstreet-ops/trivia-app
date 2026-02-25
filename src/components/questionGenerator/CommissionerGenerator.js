import React from 'react';
import QuestionGeneratorCore from './QuestionGeneratorCore';

function CommissionerGenerator({ onClose }) {
  return <QuestionGeneratorCore mode="commissioner" onClose={onClose} />;
}

export default CommissionerGenerator;
