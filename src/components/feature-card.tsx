import React, { ReactNode } from "react";

export interface FeatureCardProps {
  title?: string;
  description?: ReactNode;
}

export function FeatureCard({ title, description }: FeatureCardProps): JSX.Element {
  return (
    <div className="bg-gray-800/20 border border-gray-900 rounded-lg p-6 dark:border-neutral-800">
      {title && (
        <>
          <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
          <div className="space-y-1" />
        </>
      )}

      {description && <div className="text-gray-400">{description}</div>}
    </div>
  );
}