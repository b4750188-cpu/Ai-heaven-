import React from 'react';

export interface PageHeaderProps {
  category?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  category,
  title,
  description,
  actions,
  badge
}) => {
  return (
    <div className="border-b border-[#283242] pb-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          {category && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#42D9F5] tracking-wider uppercase">
              <span>AI HEAVEN</span>
              <span className="text-[#283242]">·</span>
              <span>{category}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F4F8]">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-[#9AA6B7] max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2.5 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
