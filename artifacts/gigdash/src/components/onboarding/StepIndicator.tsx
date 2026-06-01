interface StepIndicatorProps {
  steps: string[];
  current: number;
}

export default function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                i < current
                  ? "bg-amber-500 border-amber-500 text-background"
                  : i === current
                  ? "bg-background border-amber-500 text-amber-400"
                  : "bg-background border-border text-muted-foreground"
              }`}
            >
              {i < current ? (
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-[10px] font-medium whitespace-nowrap ${
                i === current ? "text-amber-400" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-px w-12 sm:w-20 mb-5 transition-all ${
                i < current ? "bg-amber-500" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
