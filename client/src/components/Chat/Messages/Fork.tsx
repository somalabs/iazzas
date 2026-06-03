import React, { useState } from 'react';
import * as Ariakit from '@ariakit/react';
import { GitFork } from 'lucide-react';
import { useToastContext } from '@librechat/client';
import { ForkOptions } from 'librechat-data-provider';
import { useLocalize, useNavigateToConvo } from '~/hooks';
import { useForkConvoMutation } from '~/data-provider';
import { cn } from '~/utils';

export default function Fork({
  messageId,
  conversationId: _convoId,
  forkingSupported = false,
  latestMessageId,
  isLast = false,
}: {
  messageId: string;
  conversationId: string | null;
  forkingSupported?: boolean;
  latestMessageId?: string;
  isLast?: boolean;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { navigateToConvo } = useNavigateToConvo();
  const [isActive, setIsActive] = useState(false);
  const popoverStore = Ariakit.usePopoverStore({ placement: 'bottom' });

  const buttonStyle = cn(
    'hover-button rounded-lg p-1.5 text-text-secondary-alt',
    'hover:text-text-primary hover:bg-surface-hover',
    'md:group-hover:visible md:group-focus-within:visible md:group-[.final-completion]:visible',
    !isLast && 'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
    'focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:outline-none',
    isActive && 'active text-text-primary bg-surface-hover',
  );

  const forkConvo = useForkConvoMutation({
    onSuccess: (data) => {
      navigateToConvo(data.conversation);
      showToast({ message: localize('com_ui_fork_success'), status: 'success' });
    },
    onMutate: () => {
      showToast({ message: localize('com_ui_fork_processing'), status: 'info' });
    },
    onError: (error) => {
      const isRateLimitError =
        (error as { response?: { status?: number }; status?: number; statusCode?: number })
          ?.response?.status === 429 ||
        (error as { status?: number })?.status === 429 ||
        (error as { statusCode?: number })?.statusCode === 429;

      showToast({
        message: isRateLimitError
          ? localize('com_ui_fork_error_rate_limit')
          : localize('com_ui_fork_error'),
        status: 'error',
      });
    },
  });

  const conversationId = _convoId ?? '';
  if (!forkingSupported || !conversationId || !messageId) {
    return null;
  }

  const handleFork = () => {
    popoverStore.hide();
    forkConvo.mutate({
      messageId,
      conversationId,
      option: ForkOptions.DIRECT_PATH,
      splitAtTarget: false,
      latestMessageId,
    });
  };

  return (
    <>
      <Ariakit.PopoverAnchor
        store={popoverStore}
        render={
          <button
            className={buttonStyle}
            onClick={() => {
              popoverStore.toggle();
              setIsActive(popoverStore.getState().open);
            }}
            type="button"
            aria-label={localize('com_ui_fork_from_here')}
            title={localize('com_ui_fork_from_here')}
          >
            <GitFork size="19" aria-hidden="true" />
          </button>
        }
      />
      <Ariakit.Popover
        store={popoverStore}
        gutter={10}
        className="popover-animate flex w-72 flex-col gap-4 rounded-2xl border border-rule bg-paper p-4 shadow-lg"
        portal={true}
        unmountOnHide={true}
        onClose={() => setIsActive(false)}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-canvas text-ink-700">
            <GitFork size="18" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold leading-5 text-ink-900">
              {localize('com_ui_fork_branch')}
            </h3>
            <p className="text-xs leading-relaxed text-ink-500">
              {localize('com_ui_fork_description')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleFork}
          className="w-full rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action transition-colors hover:bg-action-hover"
        >
          {localize('com_ui_fork_confirm')}
        </button>
      </Ariakit.Popover>
    </>
  );
}
