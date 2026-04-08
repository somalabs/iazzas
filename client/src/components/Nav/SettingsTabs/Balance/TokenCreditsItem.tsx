import React from 'react';
import { Label, InfoHoverCard, ESide } from '@librechat/client';
import { formatDisplayCredits, formatUSD } from '~/utils/credits';
import { useLocalize } from '~/hooks';

interface TokenCreditsItemProps {
  tokenCredits?: number;
}

const TokenCreditsItem: React.FC<TokenCreditsItemProps> = ({ tokenCredits }) => {
  const localize = useLocalize();
  const raw = tokenCredits ?? 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Label className="font-light">{localize('com_nav_balance')}</Label>
        <InfoHoverCard side={ESide.Bottom} text={localize('com_nav_info_balance')} />
      </div>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200" role="note">
        {formatDisplayCredits(raw)}{' '}
        <span className="text-xs text-gray-500 dark:text-gray-400">({formatUSD(raw)})</span>
      </span>
    </div>
  );
};

export default TokenCreditsItem;
