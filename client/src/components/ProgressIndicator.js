import React from 'react';

const ProgressIndicator = ({ 
  steps = [], 
  currentStep = 0, 
  orientation = 'horizontal' 
}) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div className={`${isHorizontal ? 'flex items-center' : 'flex flex-col'} space-y-4`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <div key={index} className={`flex items-center ${isHorizontal ? 'flex-1' : ''}`}>
            {/* Step Circle */}
            <div className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                ${isCompleted 
                  ? 'bg-green-500 text-white shadow-lg' 
                  : isCurrent 
                  ? 'bg-blue-500 text-white shadow-lg animate-pulse' 
                  : 'bg-gray-200 text-gray-500'
                }
              `}>
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
            </div>

            {/* Step Content */}
            <div className={`${isHorizontal ? 'ml-3' : 'mt-2'} flex-1`}>
              <h3 className={`text-sm font-medium ${
                isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
              }`}>
                {step.title}
              </h3>
              {step.description && (
                <p className={`text-xs ${
                  isCurrent ? 'text-blue-500' : isCompleted ? 'text-green-500' : 'text-gray-400'
                }`}>
                  {step.description}
                </p>
              )}
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className={`
                ${isHorizontal ? 'ml-4 flex-1 h-0.5' : 'mt-2 w-0.5 h-8'} 
                ${isCompleted ? 'bg-green-500' : 'bg-gray-200'} 
                transition-colors duration-300
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressIndicator;
