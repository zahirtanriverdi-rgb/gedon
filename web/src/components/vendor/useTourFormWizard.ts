import { useState, type ChangeEvent } from 'react';

// Number inputs are bound to `number | ''` state so clearing the field doesn't force a "0"
// back in — shared by TourForm.tsx and InternationalTourForm.tsx.
export const handleNumberInput = (setter: (v: number | '') => void) => (e: ChangeEvent<HTMLInputElement>) => {
  const raw = e.target.value;
  setter(raw === '' ? '' : Number(raw));
};

// Shared 3-step (Basic Info / Logistics / Pricing) wizard navigation used by both the
// domestic and international tour creation forms.
export function useStepWizard() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const goToNextStep = () => setCurrentStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  const goToPrevStep = () => setCurrentStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
  return { currentStep, setCurrentStep, goToNextStep, goToPrevStep };
}
