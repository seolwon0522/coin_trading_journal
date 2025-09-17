import React from 'react';
import { cn } from '@/lib/utils';

interface TradingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noPadding?: boolean;
  variant?: 'primary' | 'secondary';
}

export const TradingCard = React.forwardRef<HTMLDivElement, TradingCardProps>(
  ({ className, children, noPadding = false, variant = 'secondary', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-none border border-[#2a2a2a]',
          variant === 'primary' ? 'bg-[#0d0d0d]' : 'bg-[#161616]',
          !noPadding && 'p-3',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TradingCard.displayName = 'TradingCard';