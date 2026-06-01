import { useCallback } from 'react';
import type { SVGProps } from 'react';
import { useChatFormContext } from '~/Providers';
import { mainTextareaId } from '~/common';
import { cn } from '~/utils';

/**
 * Ferramentas-como-modos: chips de ponto-de-partida fixos da marca sob o
 * composer (estado landing). Apertar um pré-preenche o composer e foca —
 * roteia a mesma conversa para a ferramenta, em vez de abrir um app vazio.
 * Cada chip carrega um ícone discreto sinalizando a base/ferramenta conectada.
 * Creme + hairline, nunca navy (o navy é só o send).
 */
const SvgIcon = ({ children, className }: { children: React.ReactNode } & SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const SalesIcon = (props: SVGProps<SVGSVGElement>) => (
  <SvgIcon {...props}>
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </SvgIcon>
);

const InboxIcon = (props: SVGProps<SVGSVGElement>) => (
  <SvgIcon {...props}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </SvgIcon>
);

const StockIcon = (props: SVGProps<SVGSVGElement>) => (
  <SvgIcon {...props}>
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </SvgIcon>
);

const BoardIcon = (props: SVGProps<SVGSVGElement>) => (
  <SvgIcon {...props}>
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </SvgIcon>
);

type Starter = {
  label: string;
  prompt: string;
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
};

const STARTERS: Starter[] = [
  {
    label: 'Vendas da semana',
    prompt: 'Como estão as vendas desta semana por marca e região?',
    Icon: SalesIcon,
  },
  {
    label: 'Caixa de entrada',
    prompt: 'Resuma os e-mails não lidos sobre [assunto aqui] no Outlook.',
    Icon: InboxIcon,
  },
  {
    label: 'Estoque crítico',
    prompt: 'Quais produtos estão com estoque crítico nas lojas agora?',
    Icon: StockIcon,
  },
  {
    label: 'Board no Miro',
    prompt: 'Monte um board no Miro com as ideias do briefing [cole seu briefing aqui].',
    Icon: BoardIcon,
  },
];

const StarterChips = () => {
  const methods = useChatFormContext();

  const handlePick = useCallback(
    (prompt: string) => {
      methods.setValue('text', prompt, { shouldValidate: true });
      const textarea = document.getElementById(mainTextareaId) as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.focus();
        const len = textarea.value.length;
        textarea.setSelectionRange(len, len);
      }
    },
    [methods],
  );

  return (
    <div className="mx-auto mt-3 flex max-w-[760px] flex-wrap justify-center gap-2 px-2">
      {STARTERS.map(({ label, prompt, Icon }) => (
        <button
          key={label}
          type="button"
          onClick={() => handlePick(prompt)}
          className={cn(
            'group inline-flex items-center rounded-full border border-rule bg-canvas px-3.5 py-1.5 text-[13px] text-text-secondary',
            'transition-[transform,color,border-color] duration-150 hover:-translate-y-px hover:border-action/40 hover:text-text-primary',
            'motion-reduce:transition-colors motion-reduce:hover:translate-y-0',
          )}
        >
          <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-text-secondary transition-colors group-hover:text-text-primary" />
          {label}
        </button>
      ))}
    </div>
  );
};

export default StarterChips;
