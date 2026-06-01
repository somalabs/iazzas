import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { easings } from '@react-spring/web';
import { SplitText } from '@librechat/client';
import { useGetStartupConfig } from '~/data-provider';
import { useLocalize, useAuthContext } from '~/hooks';

export default function Landing() {
  const { data: startupConfig } = useGetStartupConfig();
  const { user } = useAuthContext();
  const localize = useLocalize();

  const [textHasMultipleLines, setTextHasMultipleLines] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const firstName = user?.name?.split(' ')[0] ?? '';

  const getGreeting = useCallback(() => {
    if (typeof startupConfig?.interface?.customWelcome === 'string') {
      const customWelcome = startupConfig.interface.customWelcome;
      if (user?.name && customWelcome.includes('{{user.name}}')) {
        return customWelcome.replace(/{{user.name}}/g, user.name);
      }
      return customWelcome;
    }

    const now = new Date();
    const hours = now.getHours();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (hours >= 0 && hours < 5) return localize('com_ui_late_night');
    if (hours < 12) {
      if (isWeekend) return localize('com_ui_weekend_morning');
      return localize('com_ui_good_morning');
    }
    if (hours < 17) return localize('com_ui_good_afternoon');
    return localize('com_ui_good_evening');
  }, [localize, startupConfig?.interface?.customWelcome, user?.name]);

  const handleLineCountChange = useCallback((count: number) => {
    setTextHasMultipleLines(count > 1);
    setLineCount(count);
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.offsetHeight);
    }
  }, [lineCount]);

  const getDynamicMargin = useMemo(() => {
    let margin = 'mb-0';
    if (lineCount > 2) {
      margin = 'mb-10';
    } else if (lineCount > 1) {
      margin = 'mb-6';
    } else if (textHasMultipleLines) {
      margin = 'mb-4';
    }
    if (contentHeight > 200) margin = 'mb-16';
    else if (contentHeight > 150) margin = 'mb-12';
    return margin;
  }, [lineCount, textHasMultipleLines, contentHeight]);

  const greetingText =
    typeof startupConfig?.interface?.customWelcome === 'string'
      ? getGreeting()
      : getGreeting() + (firstName ? `, ${firstName}.` : '.');

  return (
    <div
      className={`flex shrink-0 transform-gpu flex-col items-center justify-center overflow-hidden pb-16 transition-all duration-200 max-h-full ${getDynamicMargin}`}
    >
      <div ref={contentRef} className="flex flex-col items-center gap-0 p-2">
        <SplitText
          key={`split-text-${greetingText}`}
          text={greetingText}
          className="font-editorial text-3xl font-medium tracking-[-0.5px] text-text-primary sm:text-4xl"
          delay={50}
          textAlign="center"
          animationFrom={{ opacity: 0, transform: 'translate3d(0,50px,0)' }}
          animationTo={{ opacity: 1, transform: 'translate3d(0,0,0)' }}
          easing={easings.easeOutCubic}
          threshold={0}
          rootMargin="0px"
          onLineCountChange={handleLineCountChange}
        />
        <div className="animate-fadeIn mt-3 text-center text-[15px] font-normal text-text-secondary">
          {localize('com_ui_landing_subline')}
        </div>
      </div>
    </div>
  );
}
