"use client";

interface QuoteStepNavProps {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  backDisabled?: boolean;
  nextDisabled?: boolean;
}

export function QuoteStepNav({
  onBack,
  onNext,
  nextLabel = "Continue",
  backDisabled = false,
  nextDisabled = false,
}: QuoteStepNavProps) {
  return (
    <div className="quote-step__nav">
      <button
        type="button"
        className="quote-step__btn quote-step__btn--back"
        onClick={onBack}
        disabled={backDisabled}
      >
        Back
      </button>
      <button
        type="button"
        className="quote-step__btn quote-step__btn--primary"
        onClick={onNext}
        disabled={nextDisabled}
      >
        {nextLabel}
      </button>
    </div>
  );
}
