import { Globe, FileSearch, SquareTerminal } from 'lucide-react';
import { Tools } from 'librechat-data-provider';
import type { LucideIcon } from 'lucide-react';
import type { TranslationKeys } from '~/hooks';

/**
 * Shared mapping from a built-in capability flag to its marketplace icon and
 * localized label. Used by both the agent card and the detail dialog.
 */
export const CAPABILITY_META: Record<string, { icon: LucideIcon; label: TranslationKeys }> = {
  [Tools.web_search]: { icon: Globe, label: 'com_ui_web_search' },
  [Tools.execute_code]: { icon: SquareTerminal, label: 'com_agents_capability_execute_code' },
  [Tools.file_search]: { icon: FileSearch, label: 'com_agents_capability_file_search' },
};
