'use client';

import { type WizardStep, STEP_LABELS, isStepValid, canProceedToStep } from './wizard-types';
import type { WizardState } from './wizard-types';

interface WizardStepperProps {
  currentStep: WizardStep;
  state: WizardState;
  onStepClick: (step: WizardStep) => void;
}

const STEPS: WizardStep[] = [1, 2, 3, 4, 5, 6];

export default function WizardStepper({ currentStep, state, onStepClick }: WizardStepperProps) {
  return (
    <>
      {/* Desktop stepper */}
      <div className="hidden sm:flex items-center gap-1 mb-8">
        {STEPS.map((step, i) => {
          const isCurrent = step === currentStep;
          const isCompleted = step < currentStep && isStepValid(state, step);
          const canNavigate = canProceedToStep(state, step);

          return (
            <div key={step} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => canNavigate && onStepClick(step)}
                disabled={!canNavigate}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all w-full
                  ${isCurrent
                    ? 'bg-[rgba(0,245,255,0.08)] border border-[var(--neon-cyan)] text-[var(--text-primary)] shadow-[0_0_12px_rgba(0,245,255,0.15)]'
                    : isCompleted
                      ? 'bg-[rgba(16,255,176,0.06)] border border-[rgba(16,255,176,0.2)] text-[var(--neon-green)]'
                      : 'bg-[var(--bg-glass)] border border-[var(--border-glass)] text-[var(--text-tertiary)]'
                  }
                  ${canNavigate && !isCurrent ? 'cursor-pointer hover:bg-[var(--bg-glass-hover)]' : ''}
                  ${!canNavigate ? 'opacity-40 cursor-not-allowed' : ''}
                `}
              >
                <span className={`
                  flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0
                  ${isCurrent
                    ? 'bg-[var(--neon-cyan)] text-[var(--bg-dark)]'
                    : isCompleted
                      ? 'bg-[var(--neon-green)] text-[var(--bg-dark)]'
                      : 'bg-[var(--bg-glass)] text-[var(--text-tertiary)] border border-[var(--border-glass)]'
                  }
                `}>
                  {isCompleted ? (
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : step}
                </span>
                <span className="truncate">{STEP_LABELS[step]}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-4 h-px mx-1 shrink-0 ${
                  step < currentStep ? 'bg-[var(--neon-green)]' : 'bg-[var(--border-glass)]'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile stepper */}
      <div className="sm:hidden mb-6">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-mono text-[var(--neon-cyan)]">
            Step {currentStep} of 6
          </span>
          <span className="text-xs font-mono text-[var(--text-secondary)]">
            {STEP_LABELS[currentStep]}
          </span>
        </div>
        <div className="flex gap-1 mt-2">
          {STEPS.map((step) => (
            <div
              key={step}
              className={`h-1 flex-1 rounded-full transition-colors ${
                step < currentStep
                  ? 'bg-[var(--neon-green)]'
                  : step === currentStep
                    ? 'bg-[var(--neon-cyan)]'
                    : 'bg-[var(--border-glass)]'
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
