interface MobileStepperProps {
  activeStep: number;
  steps: number;
  onStepClick: (step: number) => void;
  className?: string;
}

export const MobileStepper = ({ activeStep, steps, onStepClick, className = "" }: MobileStepperProps) => (
  <div className={className}>
    {Array.from(Array(steps).keys()).map((step) => (
      <button
        key={step}
        type="button"
        aria-label={`Ir para passo ${step + 1}`}
        onClick={() => onStepClick(step)}
        className={`
          float-left h-3 w-3 ml-2.5 rounded-full cursor-pointer transition-colors
          ${activeStep === step ? "bg-yellow" : "bg-gray-300"}
        `}
      />
    ))}
  </div>
);
