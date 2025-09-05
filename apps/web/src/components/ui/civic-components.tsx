import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { colors, borderRadius, transitions } from '@/lib/design-system';

// Card Component with CivicLens styling
const cardVariants = cva(
  'rounded-2xl bg-white shadow-lg transition-all duration-200', {
  variants: {
    variant: {
      default: 'border border-gray-200',
      elevated: 'shadow-xl border border-gray-100',
      primary: 'bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200',
      secondary: 'bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200',
      accent: 'bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200',
      success: 'bg-gradient-to-br from-lime-50 to-lime-100 border border-lime-200',
      warning: 'bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200',
      error: 'bg-gradient-to-br from-red-50 to-red-100 border border-red-200',
    },
    size: {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
    hover: {
      true: 'hover:shadow-xl hover:-translate-y-1 cursor-pointer',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
    hover: false,
  },
});

interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, hover, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, size, hover }), className)}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

// Button Component with CivicLens styling
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
  {
    variants: {
      variant: {
        default: 'bg-teal-500 text-white hover:bg-teal-600 focus-visible:ring-teal-500',
        secondary: 'bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500',
        accent: 'bg-violet-500 text-white hover:bg-violet-600 focus-visible:ring-violet-500',
        success: 'bg-lime-500 text-white hover:bg-lime-600 focus-visible:ring-lime-500',
        warning: 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500',
        destructive: 'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500',
        outline: 'border-2 border-teal-500 text-teal-500 hover:bg-teal-50 focus-visible:ring-teal-500',
        ghost: 'text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500',
        link: 'text-teal-500 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// Badge Component for risk scores and status indicators
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800',
        primary: 'bg-teal-100 text-teal-800',
        secondary: 'bg-orange-100 text-orange-800',
        accent: 'bg-violet-100 text-violet-800',
        success: 'bg-lime-100 text-lime-800',
        warning: 'bg-amber-100 text-amber-800',
        destructive: 'bg-red-100 text-red-800',
        outline: 'border border-gray-200 text-gray-600',
      },
      size: {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

// Risk Score Badge with color coding
interface RiskScoreBadgeProps {
  score: number;
  className?: string;
}

export const RiskScoreBadge: React.FC<RiskScoreBadgeProps> = ({ score, className }) => {
  const getVariant = (score: number) => {
    if (score <= 30) return 'success';
    if (score <= 50) return 'warning';
    if (score <= 70) return 'secondary';
    return 'destructive';
  };

  const getLabel = (score: number) => {
    if (score <= 30) return 'Low Risk';
    if (score <= 50) return 'Medium Risk';
    if (score <= 70) return 'High Risk';
    return 'Critical Risk';
  };

  return (
    <Badge variant={getVariant(score)} className={className}>
      {score} - {getLabel(score)}
    </Badge>
  );
};

// Input Component with CivicLens styling
const inputVariants = cva(
  'flex w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-3 py-2',
        lg: 'h-12 px-4 py-3 text-base',
      },
      state: {
        default: 'border-gray-300 focus-visible:ring-teal-500',
        error: 'border-red-300 focus-visible:ring-red-500',
        success: 'border-lime-300 focus-visible:ring-lime-500',
      },
    },
    defaultVariants: {
      size: 'md',
      state: 'default',
    },
  }
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, state, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ size, state }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

// Loading Spinner Component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn('animate-spin rounded-full border-2 border-gray-300 border-t-teal-500', sizeClasses[size], className)} />
  );
};

// Empty State Component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-500 mb-4 max-w-sm">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};

// Module Icon Component
interface ModuleIconProps {
  module: 'procureLens' | 'feeCheck' | 'rtiCopilot' | 'fairLine' | 'permitPath' | 'wardWallet';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ModuleIcon: React.FC<ModuleIconProps> = ({ module, size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const moduleConfig = {
    procureLens: { icon: '🏛', color: 'text-teal-500' },
    feeCheck: { icon: '💵', color: 'text-orange-500' },
    rtiCopilot: { icon: '📜', color: 'text-violet-500' },
    fairLine: { icon: '⚖️', color: 'text-red-500' },
    permitPath: { icon: '📋', color: 'text-amber-500' },
    wardWallet: { icon: '📊', color: 'text-lime-500' },
  };

  const config = moduleConfig[module];

  return (
    <div className={cn('flex items-center justify-center rounded-2xl', sizeClasses[size], config.color, className)}>
      <span className="text-2xl">{config.icon}</span>
    </div>
  );
};

// Language Toggle Component
interface LanguageToggleProps {
  currentLanguage: 'en' | 'bn';
  onLanguageChange: (language: 'en' | 'bn') => void;
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ currentLanguage, onLanguageChange, className }) => {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Button
        variant={currentLanguage === 'en' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onLanguageChange('en')}
      >
        English
      </Button>
      <Button
        variant={currentLanguage === 'bn' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onLanguageChange('bn')}
      >
        বাংলা
      </Button>
    </div>
  );
};