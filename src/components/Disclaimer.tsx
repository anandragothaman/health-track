import { Info } from 'lucide-react';

export function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-start gap-2 text-sm text-muted ${className}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        This is a personal monitoring tool, not a medical device, and does not provide diagnoses or treatment advice.
        Category labels use published reference ranges; individual targets vary — follow the targets agreed with your
        healthcare professional.
      </span>
    </p>
  );
}
