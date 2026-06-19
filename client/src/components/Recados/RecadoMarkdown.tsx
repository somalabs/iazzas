import MarkdownLite from '~/components/Chat/Messages/Content/MarkdownLite';
import { cn } from '~/utils';

/** GitHub-style markdown typography for recados (popup, inbox, and editor preview). */
const proseClasses = cn(
  'break-words text-sm leading-relaxed text-text-primary',
  '[&_h1]:mb-3 [&_h1]:mt-0 [&_h1]:border-b [&_h1]:border-border-medium [&_h1]:pb-2 [&_h1]:text-2xl [&_h1]:font-bold',
  '[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold',
  '[&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold',
  '[&_p]:my-2',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1',
  '[&_strong]:font-semibold',
  '[&_hr]:my-5 [&_hr]:border-border-medium',
  '[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-border-medium [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-text-secondary',
  '[&_a]:text-blue-700 [&_a]:underline dark:[&_a]:text-blue-400',
  '[&_code]:rounded [&_code]:bg-surface-tertiary [&_code]:px-1 [&_code]:py-0.5',
  '[&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-border-medium',
);

export default function RecadoMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn(proseClasses, className)}>
      <MarkdownLite content={content} codeExecution={false} />
    </div>
  );
}
