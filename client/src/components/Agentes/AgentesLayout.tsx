import React, { useState, useEffect } from 'react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import DragHandle from './DragHandle';

interface AgentesLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export default function AgentesLayout({ left, right }: AgentesLayoutProps) {
  const localize = useLocalize();
  const [leftPct, setLeftPct] = useState(40);
  const [activeTab, setActiveTab] = useState<'config' | 'chat'>('config');
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);

  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 768);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function onDrag(clientX: number) {
    const pct = (clientX / window.innerWidth) * 100;
    setLeftPct(Math.min(Math.max(pct, 25), 70));
  }

  if (!isDesktop) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex border-b border-border-medium">
          <button
            type="button"
            className={cn(
              'flex-1 py-2 text-sm font-medium transition-colors',
              activeTab === 'config'
                ? 'bg-surface-active text-text-primary'
                : 'text-text-secondary hover:text-text-primary',
            )}
            onClick={() => setActiveTab('config')}
          >
            {localize('com_ui_ux_configurar_tab')}
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 py-2 text-sm font-medium transition-colors',
              activeTab === 'chat'
                ? 'bg-surface-active text-text-primary'
                : 'text-text-secondary hover:text-text-primary',
            )}
            onClick={() => setActiveTab('chat')}
          >
            {localize('com_ui_ux_conversar_tab')}
          </button>
        </div>
        <div className="flex-1 overflow-hidden">{activeTab === 'config' ? left : right}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div style={{ width: `${leftPct}%`, overflowY: 'auto', overflowX: 'hidden' }}>{left}</div>
      <DragHandle onDrag={onDrag} />
      <div style={{ flex: 1, overflow: 'hidden' }}>{right}</div>
    </div>
  );
}
