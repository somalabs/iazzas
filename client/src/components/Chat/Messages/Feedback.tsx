import React, { useState, useCallback, useMemo, useEffect } from 'react';
import * as Ariakit from '@ariakit/react';
import { TFeedback, TFeedbackTag, getTagsForRating } from 'librechat-data-provider';
import {
  OGDialog,
  OGDialogContent,
  OGDialogTitle,
  ThumbUpIcon,
  ThumbDownIcon,
} from '@librechat/client';
import {
  AlertCircle,
  PenTool,
  ImageOff,
  Ban,
  HelpCircle,
  CheckCircle,
  Lightbulb,
  Search,
} from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface FeedbackProps {
  handleFeedback: ({ feedback }: { feedback: TFeedback | undefined }) => void;
  feedback?: TFeedback;
  isLast?: boolean;
}

const ICONS = {
  AlertCircle,
  PenTool,
  ImageOff,
  Ban,
  HelpCircle,
  CheckCircle,
  Lightbulb,
  Search,
  ThumbsUp: ThumbUpIcon,
  ThumbsDown: ThumbDownIcon,
};

function FeedbackOptionButton({
  tag,
  active,
  onClick,
}: {
  tag: TFeedbackTag;
  active?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const localize = useLocalize();
  const Icon = ICONS[tag.icon as keyof typeof ICONS] || AlertCircle;
  const label = localize(tag.label as Parameters<typeof localize>[0]);

  return (
    <button
      className={cn(
        'flex w-full items-center gap-3 rounded-xl p-2 text-text-secondary transition-colors duration-200 hover:bg-surface-hover hover:text-text-primary',
        active && 'bg-surface-hover font-semibold text-text-primary',
      )}
      onClick={onClick}
      type="button"
      aria-label={label}
      aria-pressed={active}
    >
      <Icon size="19" bold={active} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function FeedbackButtons({
  isLast,
  feedback,
  onFeedback,
  onOther,
}: {
  isLast: boolean;
  feedback?: TFeedback;
  onFeedback: (fb: TFeedback | undefined) => void;
  onOther?: () => void;
}) {
  const localize = useLocalize();
  const upStore = Ariakit.usePopoverStore({ placement: 'bottom' });
  const downStore = Ariakit.usePopoverStore({ placement: 'bottom' });

  const positiveTags = useMemo(() => getTagsForRating('thumbsUp'), []);
  const negativeTags = useMemo(() => getTagsForRating('thumbsDown'), []);

  const upActive = feedback?.rating === 'thumbsUp' ? feedback.tag?.key : undefined;
  const downActive = feedback?.rating === 'thumbsDown' ? feedback.tag?.key : undefined;

  const handleThumbsUpClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (feedback?.rating !== 'thumbsUp') {
        upStore.toggle();
        return;
      }
      onFeedback(undefined);
    },
    [feedback, onFeedback, upStore],
  );

  const handleUpOption = useCallback(
    (tag: TFeedbackTag) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      upStore.hide();
      onFeedback({ rating: 'thumbsUp', tag });
      if (tag.key === 'other') {
        onOther?.();
      }
    },
    [onFeedback, onOther, upStore],
  );

  const handleThumbsDownClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (feedback?.rating !== 'thumbsDown') {
        downStore.toggle();
        return;
      }

      onOther?.();
    },
    [feedback, onOther, downStore],
  );

  const handleDownOption = useCallback(
    (tag: TFeedbackTag) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      downStore.hide();
      onFeedback({ rating: 'thumbsDown', tag });
      if (tag.key === 'other') {
        onOther?.();
      }
    },
    [onFeedback, onOther, downStore],
  );

  return (
    <>
      <Ariakit.PopoverAnchor
        store={upStore}
        render={
          <button
            className={buttonClasses(feedback?.rating === 'thumbsUp', isLast)}
            onClick={handleThumbsUpClick}
            type="button"
            title={localize('com_ui_feedback_positive')}
            aria-pressed={feedback?.rating === 'thumbsUp'}
            aria-haspopup="menu"
          >
            <ThumbUpIcon size="19" bold={feedback?.rating === 'thumbsUp'} />
          </button>
        }
      />
      <Ariakit.Popover
        store={upStore}
        gutter={8}
        portal
        unmountOnHide
        className="popover-animate flex w-auto flex-col gap-1.5 overflow-hidden rounded-2xl border border-border-medium bg-surface-secondary p-1.5 shadow-lg"
      >
        <div className="flex flex-col items-stretch justify-center">
          {positiveTags.map((tag) => (
            <FeedbackOptionButton
              key={tag.key}
              tag={tag}
              active={upActive === tag.key}
              onClick={handleUpOption(tag)}
            />
          ))}
        </div>
      </Ariakit.Popover>

      <Ariakit.PopoverAnchor
        store={downStore}
        render={
          <button
            className={buttonClasses(feedback?.rating === 'thumbsDown', isLast)}
            onClick={handleThumbsDownClick}
            type="button"
            title={localize('com_ui_feedback_negative')}
            aria-pressed={feedback?.rating === 'thumbsDown'}
            aria-haspopup="menu"
          >
            <ThumbDownIcon size="19" bold={feedback?.rating === 'thumbsDown'} />
          </button>
        }
      />
      <Ariakit.Popover
        store={downStore}
        gutter={8}
        portal
        unmountOnHide
        className="popover-animate flex w-auto flex-col gap-1.5 overflow-hidden rounded-2xl border border-border-medium bg-surface-secondary p-1.5 shadow-lg"
      >
        <div className="flex flex-col items-stretch justify-center">
          {negativeTags.map((tag) => (
            <FeedbackOptionButton
              key={tag.key}
              tag={tag}
              active={downActive === tag.key}
              onClick={handleDownOption(tag)}
            />
          ))}
        </div>
      </Ariakit.Popover>
    </>
  );
}

function buttonClasses(isActive: boolean, isLast: boolean) {
  return cn(
    'hover-button rounded-lg p-1.5 text-text-secondary-alt',
    'hover:text-text-primary hover:bg-surface-hover',
    'md:group-hover:visible md:group-focus-within:visible md:group-[.final-completion]:visible',
    !isLast && 'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
    'focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:outline-none',
    isActive && 'active text-text-primary bg-surface-hover',
  );
}

export default function Feedback({
  isLast = false,
  handleFeedback,
  feedback: initialFeedback,
}: FeedbackProps) {
  const localize = useLocalize();
  const [openDialog, setOpenDialog] = useState(false);
  const [feedback, setFeedback] = useState<TFeedback | undefined>(initialFeedback);

  useEffect(() => {
    setFeedback(initialFeedback);
  }, [initialFeedback]);

  const propagateMinimal = useCallback(
    (fb: TFeedback | undefined) => {
      setFeedback(fb);
      handleFeedback({ feedback: fb });
    },
    [handleFeedback],
  );

  const handleButtonFeedback = useCallback(
    (fb: TFeedback | undefined) => {
      if (fb?.tag?.key === 'other') setOpenDialog(true);
      else setOpenDialog(false);
      propagateMinimal(fb);
    },
    [propagateMinimal],
  );

  const handleOtherOpen = useCallback(() => setOpenDialog(true), []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback((prev) => (prev ? { ...prev, text: e.target.value } : undefined));
  };

  const handleDialogSave = useCallback(() => {
    if (feedback?.tag?.key === 'other' && !feedback?.text?.trim()) {
      return;
    }
    propagateMinimal(feedback);
    setOpenDialog(false);
  }, [feedback, propagateMinimal]);

  const handleDialogClear = useCallback(() => {
    setFeedback(undefined);
    handleFeedback({ feedback: undefined });
    setOpenDialog(false);
  }, [handleFeedback]);

  const selectedTag = feedback?.tag?.key && feedback.tag.key !== 'other' ? feedback.tag : undefined;
  const SelectedTagIcon = selectedTag
    ? ICONS[selectedTag.icon as keyof typeof ICONS] || AlertCircle
    : AlertCircle;
  const selectedTagLabel = selectedTag
    ? localize(selectedTag.label as Parameters<typeof localize>[0])
    : undefined;

  const renderSingleFeedbackButton = () => {
    if (!feedback) return null;
    const isThumbsUp = feedback.rating === 'thumbsUp';
    const Icon = isThumbsUp ? ThumbUpIcon : ThumbDownIcon;
    const label = isThumbsUp
      ? localize('com_ui_feedback_positive')
      : localize('com_ui_feedback_negative');
    return (
      <button
        className={buttonClasses(true, isLast)}
        onClick={() => {
          if (isThumbsUp) {
            handleButtonFeedback(undefined);
          } else {
            setOpenDialog(true);
          }
        }}
        type="button"
        title={label}
        aria-pressed="true"
      >
        <Icon size="19" bold />
      </button>
    );
  };

  return (
    <>
      {feedback ? (
        renderSingleFeedbackButton()
      ) : (
        <FeedbackButtons
          isLast={isLast}
          feedback={feedback}
          onFeedback={handleButtonFeedback}
          onOther={handleOtherOpen}
        />
      )}
      <OGDialog open={openDialog} onOpenChange={setOpenDialog}>
        <OGDialogContent className="w-11/12 max-w-md gap-0 bg-paper p-6">
          <div className="flex flex-col gap-1 pr-7">
            <OGDialogTitle className="text-lg font-semibold leading-6 text-ink-900">
              {localize('com_ui_feedback_more_information')}
            </OGDialogTitle>
            <p className="text-sm leading-relaxed text-ink-500">
              {localize('com_ui_feedback_subtitle')}
            </p>
          </div>
          {selectedTagLabel && (
            <div className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-rule bg-canvas px-3 py-1 text-xs font-medium text-ink-700">
              <SelectedTagIcon size="14" aria-hidden="true" />
              <span>{selectedTagLabel}</span>
            </div>
          )}
          <div className="relative mt-4">
            <textarea
              // eslint-disable-next-line jsx-a11y/no-autofocus -- feedback modal intentionally focuses its input on open
              autoFocus
              className="min-h-[120px] w-full resize-none rounded-xl border border-rule bg-canvas p-3 pb-7 text-sm leading-relaxed text-ink-900 transition-shadow duration-150 placeholder:text-ink-500 focus:border-action focus:shadow-[0_0_0_3px_rgba(39,69,102,0.14)] focus:outline-none"
              value={feedback?.text || ''}
              onChange={handleTextChange}
              rows={4}
              placeholder={localize('com_ui_feedback_placeholder')}
              maxLength={500}
            />
            <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs tabular-nums text-ink-500">
              {feedback?.text?.length ?? 0}/500
            </span>
          </div>
          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleDialogClear}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-surface-hover"
            >
              {localize('com_ui_feedback_remove')}
            </button>
            <button
              type="button"
              onClick={handleDialogSave}
              disabled={!feedback?.text?.trim()}
              className="rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action transition-colors hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {localize('com_ui_submit')}
            </button>
          </div>
        </OGDialogContent>
      </OGDialog>
    </>
  );
}
