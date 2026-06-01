import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TConversation } from 'librechat-data-provider';
import { useConversationsInfiniteQuery } from '~/data-provider';
import { useAuthContext, useLocalize } from '~/hooks';

/**
 * "Retome de onde parou" (F5 / P2-A) — seção editorial de trabalho-recente
 * no landing. Grid 3-up de cards 4:5 com fotografia de campanha Azzas como
 * material, título Playfair + timestamp. Conta nova → faixa de campanha
 * full-bleed (zero-state desenhado, nunca caixa tracejada).
 */
const BRAND_IMAGES = [
  '/assets/brand/azzas-campaign-2.jpg',
  '/assets/brand/azzas-editorial-1.jpg',
  '/assets/brand/azzas-figures.jpg',
];

function formatDate(d?: string) {
  if (!d) {
    return '';
  }
  try {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

export default function RecentWork() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  const { data } = useConversationsInfiniteQuery(
    {},
    { enabled: isAuthenticated, staleTime: 60000 },
  );

  const recent = useMemo<TConversation[]>(() => {
    const first = data?.pages?.[0]?.conversations ?? [];
    return first
      .filter((c) => c.conversationId && c.conversationId !== 'new')
      .slice(0, 3);
  }, [data]);

  // Conta nova / sem histórico: faixa de campanha full-bleed (zero-state desenhado).
  if (recent.length === 0) {
    return (
      <section className="mt-12 w-full overflow-hidden px-2">
        <div className="relative h-40 overflow-hidden rounded-[14px] border border-rule">
          <img
            src={BRAND_IMAGES[0]}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover grayscale contrast-[1.05]"
            style={{ opacity: 0.55 }}
          />
          <div className="absolute inset-0 bg-action mix-blend-multiply" style={{ opacity: 0.45 }} />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="font-editorial text-xl font-medium text-on-action">
              {localize('com_ui_first_creation')}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-12 w-full overflow-hidden px-2">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-editorial text-lg italic text-text-primary">
          {localize('com_ui_resume_where_left')}
        </h2>
        <div className="h-px flex-1 bg-rule" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {recent.map((c, i) => (
          <button
            key={c.conversationId}
            type="button"
            onClick={() => navigate(`/c/${c.conversationId}`)}
            className="group text-left"
          >
            <p className="line-clamp-1 font-editorial text-[15px] font-semibold text-text-primary">
              {c.title || localize('com_ui_new_chat')}
            </p>
            <p className="mb-2 text-[11px] text-text-tertiary">{formatDate(c.updatedAt)}</p>
            <div className="relative aspect-[3/2] overflow-hidden rounded-[12px] border border-rule bg-canvas">
              <img
                src={BRAND_IMAGES[i % BRAND_IMAGES.length]}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover grayscale contrast-[1.05] transition-transform duration-300 group-hover:scale-105"
                style={{ opacity: 0.85 }}
              />
            </div>
          </button>
        ))}
      </div>

    </section>
  );
}
