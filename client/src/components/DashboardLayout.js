import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const DashboardLayout = ({ children, title, subtitle, actions, sidebar, stats }) => {
  useAuth();

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-neutral-100)' }}>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        {(title || subtitle || actions) && (
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                {title && <h1 className="text-h1 text-neutral-900 mb-2">{title}</h1>}
                {subtitle && <p className="text-body-lg text-neutral-600">{subtitle}</p>}
              </div>
              {actions && (
                <div className="flex flex-wrap gap-3">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Section */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="stat-card animate-fadeInUp"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-1">{stat.label}</p>
                    <p className="stat-number">{stat.value}</p>
                  </div>
                  {stat.icon && (
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      {stat.icon}
                    </div>
                  )}
                </div>
                {stat.change && (
                  <div className="mt-4 flex items-center text-sm">
                    <span className={`mr-2 ${stat.change > 0 ? 'text-green-200' : 'text-red-200'}`}>
                      {stat.change > 0 ? '↗' : '↘'}
                    </span>
                    <span className="text-white/80">
                      {Math.abs(stat.change)}% from last month
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          {sidebar && (
            <aside className="lg:col-span-1">
              <div className="sticky top-24">
                {sidebar}
              </div>
            </aside>
          )}

          {/* Main Content Area */}
          <main className={`${sidebar ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
