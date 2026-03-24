interface Step { label: string; description: string }

const STEPS: Step[] = [
  { label: 'Your Profile',    description: 'Personal details' },
  { label: 'Store Details',   description: 'Business information' },
  { label: 'Brand & Look',    description: 'Customise appearance' },
]

export function OnboardingProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full">
      {/* Mobile: simple pill indicator */}
      <div className="flex md:hidden items-center justify-center gap-2 mb-6">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-2 rounded-full transition-all ${
            i + 1 < currentStep ? 'w-8 bg-indigo-600' :
            i + 1 === currentStep ? 'w-8 bg-indigo-600' :
            'w-2 bg-gray-200'
          }`} />
        ))}
        <span className="text-xs text-gray-500 ml-2">Step {currentStep} of {STEPS.length}</span>
      </div>

      {/* Desktop: full step list */}
      <div className="hidden md:flex items-center justify-between w-full mb-10 relative">
        {/* connector line */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-gray-200 z-0" />
        <div
          className="absolute top-5 left-8 h-0.5 bg-indigo-600 z-0 transition-all duration-500"
          style={{ width: `calc(${((currentStep - 1) / (STEPS.length - 1)) * 100}% - 2rem)` }}
        />

        {STEPS.map((step, i) => {
          const stepNum = i + 1
          const done = stepNum < currentStep
          const active = stepNum === currentStep

          return (
            <div key={i} className="flex flex-col items-center z-10 gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                done    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' :
                active  ? 'bg-white border-2 border-indigo-600 text-indigo-600 shadow-md' :
                          'bg-white border-2 border-gray-200 text-gray-400'
              }`}>
                {done ? '✓' : stepNum}
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold ${active ? 'text-indigo-600' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-gray-400">{step.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
