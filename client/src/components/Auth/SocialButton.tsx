import React from 'react';

type SocialButtonProps = {
  id: string;
  enabled?: boolean;
  serverDomain?: string;
  oauthPath: string;
  Icon: React.ElementType;
  label?: string;
  variant?: 'primary' | 'secondary';
};

const variantClasses: Record<NonNullable<SocialButtonProps['variant']>, string> = {
  primary: 'border border-transparent bg-surface-submit text-white hover:bg-surface-submit-hover',
  secondary:
    'border border-border-light bg-surface-primary text-text-primary hover:bg-surface-tertiary',
};

const SocialButton = ({
  id,
  enabled,
  serverDomain,
  oauthPath,
  Icon,
  label,
  variant = 'secondary',
}: SocialButtonProps) => {
  if (!enabled) {
    return null;
  }

  return (
    <div className="mt-2 flex gap-x-2">
      <a
        aria-label={label}
        className={`flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-3 text-sm font-medium transition-colors duration-200 ${variantClasses[variant]}`}
        href={`${serverDomain}/oauth/${oauthPath}`}
        data-testid={id}
      >
        <Icon />
        <p>{label}</p>
      </a>
    </div>
  );
};

export default SocialButton;
