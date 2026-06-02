import { useLocalize } from '~/hooks';

const ICONS = ['✨', '🤖', '📚', '🎨', '🛠️', '💡', '📈', '🧭', '🔍', '💬', '⚙️', '🧪'];

const COLORS = [
  'var(--azzas-navy)',
  'var(--azzas-steel)',
  'var(--azzas-blue-soft)',
  'var(--azzas-blue-light)',
  'var(--azzas-surface-warm)',
  'var(--azzas-surface-cream)',
];

export default function IconPicker({
  icon,
  iconColor,
  onSelectIcon,
  onSelectColor,
}: {
  icon: string | null;
  iconColor: string | null;
  onSelectIcon: (icon: string) => void;
  onSelectColor: (color: string) => void;
}) {
  const localize = useLocalize();
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-2 text-sm font-medium text-token-text-primary">
          {localize('com_ui_avatar_pick_icon')}
        </p>
        <div className="grid grid-cols-6 gap-2">
          {ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={emoji}
              aria-pressed={icon === emoji}
              onClick={() => onSelectIcon(emoji)}
              className={
                'flex h-9 w-9 items-center justify-center rounded-md text-lg ' +
                (icon === emoji ? 'ring-2 ring-[var(--azzas-navy)]' : 'hover:bg-surface-tertiary')
              }
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-token-text-primary">
          {localize('com_ui_avatar_pick_color')}
        </p>
        <div className="flex gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              aria-pressed={iconColor === color}
              onClick={() => onSelectColor(color)}
              style={{ backgroundColor: color }}
              className={
                'h-7 w-7 rounded-full border border-border-light ' +
                (iconColor === color ? 'ring-2 ring-offset-2 ring-[var(--azzas-navy)]' : '')
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
