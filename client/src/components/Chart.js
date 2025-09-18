import React from 'react';

const Chart = ({ 
  type = 'bar',
  data = [],
  labels = [],
  title = '',
  subtitle = '',
  height = 300,
  colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'],
  showLegend = true,
  animate = true
}) => {
  // Sanitize data to prevent NaN in charts
  const sanitizedData = Array.isArray(data) ? data.map((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }) : [];
  const hasData = sanitizedData.length > 0 && sanitizedData.some((v) => v !== 0);
  const maxValueRaw = sanitizedData.length ? Math.max(...sanitizedData) : 0;
  const minValueRaw = sanitizedData.length ? Math.min(...sanitizedData) : 0;
  // Avoid divide-by-zero when all values equal
  const range = (maxValueRaw - minValueRaw) || 1;
  const maxValue = maxValueRaw || 1;
  const minValue = minValueRaw;

  const renderBarChart = () => (
    <div className="relative" style={{ height }}>
      <div className="flex items-end justify-between h-full gap-2">
        {sanitizedData.map((value, index) => {
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const color = colors[index % colors.length];
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="relative w-full">
                <div
                  className="w-full rounded-t-lg transition-all duration-1000 ease-out"
                  style={{
                    height: `${percentage}%`,
                    backgroundColor: color,
                    minHeight: '4px'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-t-lg"></div>
                </div>
              </div>
              {labels[index] && (
                <div className="mt-2 text-center">
                  <div className="text-xs font-medium text-neutral-700">{labels[index]}</div>
                  <div className="text-lg font-bold text-neutral-900">{value}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderLineChart = () => (
    <div className="relative" style={{ height }}>
      <svg className="w-full h-full" viewBox={`0 0 100 ${height}`}>
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors[0]} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <path
          d={sanitizedData.map((value, index) => {
            const x = (index / Math.max(1, (sanitizedData.length - 1))) * 100;
            const y = height - ((value - minValue) / range) * height;
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ')}
          fill="url(#lineGradient)"
          opacity="0.3"
        />
        
        {/* Line */}
        <path
          d={sanitizedData.map((value, index) => {
            const x = (index / Math.max(1, (sanitizedData.length - 1))) * 100;
            const y = height - ((value - minValue) / range) * height;
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ')}
          stroke={colors[0]}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {sanitizedData.map((value, index) => {
          const x = (index / Math.max(1, (sanitizedData.length - 1))) * 100;
          const y = height - ((value - minValue) / range) * height;
          
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill={colors[0]}
              stroke="white"
              strokeWidth="2"
            />
          );
        })}
      </svg>
      
      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between">
        {labels.map((label, index) => (
          <div key={index} className="text-xs text-neutral-600 text-center">
            {label}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPieChart = () => {
    const total = sanitizedData.reduce((sum, value) => sum + value, 0);
    let currentAngle = 0;
    
    return (
      <div className="relative" style={{ height }}>
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {sanitizedData.map((value, index) => {
            const percentage = total > 0 ? value / total : 0;
            const angle = percentage * 360;
            const color = colors[index % colors.length];
            
            const x1 = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
            const y1 = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);
            const x2 = 50 + 40 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
            const y2 = 50 + 40 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M 50 50`,
              `L ${x1} ${y1}`,
              `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');
            
            currentAngle += angle;
            
            return (
              <path
                key={index}
                d={pathData}
                fill={color}
                stroke="white"
                strokeWidth="2"
                className="transition-all duration-500 hover:opacity-80"
              />
            );
          })}
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-900">{total}</div>
            <div className="text-sm text-neutral-600">Total</div>
          </div>
        </div>
      </div>
    );
  };

  const renderDoughnutChart = () => {
    const total = sanitizedData.reduce((sum, value) => sum + value, 0);
    let currentAngle = 0;
    
    return (
      <div className="relative" style={{ height }}>
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {sanitizedData.map((value, index) => {
            const percentage = total > 0 ? value / total : 0;
            const angle = percentage * 360;
            const color = colors[index % colors.length];
            
            const x1 = 50 + 35 * Math.cos((currentAngle * Math.PI) / 180);
            const y1 = 50 + 35 * Math.sin((currentAngle * Math.PI) / 180);
            const x2 = 50 + 35 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
            const y2 = 50 + 35 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M ${x1} ${y1}`,
              `A 35 35 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            ].join(' ');
            
            currentAngle += angle;
            
            return (
              <path
                key={index}
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                className="transition-all duration-500 hover:stroke-width-10"
              />
            );
          })}
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl font-bold text-neutral-900">{total}</div>
            <div className="text-xs text-neutral-600">Total</div>
          </div>
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'pie':
        return renderPieChart();
      case 'doughnut':
        return renderDoughnutChart();
      default:
        return renderBarChart();
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg border border-neutral-100">
      {/* Chart Header */}
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h3 className="text-xl font-bold text-neutral-900 mb-2">{title}</h3>}
          {subtitle && <p className="text-neutral-600 font-medium">{subtitle}</p>}
        </div>
      )}
      
      {/* Chart */}
      <div className={`${animate ? 'animate-fadeInUp' : ''}`}>
        {renderChart()}
      </div>
      
      {/* Legend */}
      {showLegend && labels.length > 0 && (
        <div className="mt-6 pt-6 border-t border-neutral-200">
          <div className="flex flex-wrap gap-4">
            {labels.map((label, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ backgroundColor: colors[index % colors.length] }}
                ></div>
                <span className="text-sm font-medium text-neutral-700">{String(label)}</span>
                <span className="text-sm font-bold text-neutral-900">({sanitizedData[index] ?? 0})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chart;
