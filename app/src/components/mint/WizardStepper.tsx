'use client';

import { useRef, useEffect } from 'react';
import { type WizardStep, STEP_LABELS, isStepValid, canProceedToStep } from './wizard-types';
import type { WizardState } from './wizard-types';

interface WizardStepperProps {
  currentStep: WizardStep;
  state: WizardState;
  onStepClick: (step: WizardStep) => void;
}

const STEPS: WizardStep[] = [1, 2, 3, 4, 5, 6];

export default function WizardStepper({ currentStep, state, onStepClick }: WizardStepperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Auto-scroll to active step
  useEffect(() => {
    const container = scrollRef.current;
    const activeEl = stepRefs.current.get(currentStep);
    if (!container || !activeEl) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const offsetLeft = activeRect.left - containerRect.left + container.scrollLeft;
    const center = offsetLeft - containerRect.width / 2 + activeRect.width / 2;

    container.scrollTo({ left: center, behavior: 'smooth' });
  }, [currentStep]);

  return (
    <>
      {/* Desktop stepper — horizontally scrollable */}
      <div
        ref={scrollRef}
        className="hidden sm:flex items-center gap-1 mb-8 overflow-x-auto scrollbar-none pb-1"
      >
        {STEPS.map((step, i) => {
          const isCurrent = step === currentStep;
          const isCompleted = step < currentStep && isStepValid(state, step);
          const canNavigate = canProceedToStep(state, step);

          return (
            <div
              key={step}
              ref={(el) => { if (el) stepRefs.current.set(step, el); }}
              className="flex items-center shrink-0"
            >
              <button
                type="button"
                onClick={() => canNavigate && onStepClick(step)}
                disabled={!canNavigate}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all whitespace-nowrap
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
                <span>{STEP_LABELS[step]}</span>
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

      {/* Mobile stepper — also scrollable as pill buttons */}
      <div className="sm:hidden mb-6">
        <div
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2"
        >
          {STEPS.map((step) => {
            const isCurrent = step === currentStep;
            const isCompleted = step < currentStep && isStepValid(state, step);
            const canNavigate = canProceedToStep(state, step);

            return (
              <button
                key={step}
                type="button"
                onClick={() => canNavigate && onStepClick(step)}
                disabled={!canNavigate}
                className={`
                  shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[0.65rem] font-mono transition-all whitespace-nowrap
                  ${isCurrent
                    ? 'bg-[rgba(0,245,255,0.1)] border border-[var(--neon-cyan)] text-[var(--neon-cyan)]'
                    : isCompleted
                      ? 'bg-[rgba(16,255,176,0.06)] border border-[rgba(16,255,176,0.2)] text-[var(--neon-green)]'
                      : 'bg-[var(--bg-glass)] border border-[var(--border-glass)] text-[var(--text-tertiary)]'
                  }
                  ${!canNavigate ? 'opacity-40' : ''}
                `}
              >
                <span className={`
                  inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold shrink-0
                  ${isCurrent
                    ? 'bg-[var(--neon-cyan)] text-[var(--bg-dark)]'
                    : isCompleted
                      ? 'bg-[var(--neon-green)] text-[var(--bg-dark)]'
                      : 'bg-[var(--bg-glass)]'
                  }
                `}>
                  {isCompleted ? '✓' : step}
                </span>
                {STEP_LABELS[step]}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
