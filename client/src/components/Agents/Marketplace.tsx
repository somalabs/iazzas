import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@librechat/client';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import type t from 'librechat-data-provider';
import { useDocumentTitle, useHasAccess, useLocalize, TranslationKeys } from '~/hooks';
import { useGetEndpointsQuery, useGetAgentCategoriesQuery } from '~/data-provider';
import MarketplaceAdminSettings from './MarketplaceAdminSettings';
import { SidePanelGroup } from '~/components/SidePanel';
import CategoryTabs from './CategoryTabs';
import SearchBar from './SearchBar';
import AgentGrid from './AgentGrid';

interface AgentMarketplaceProps {
  className?: string;
}

/**
 * AgentMarketplace - Main component for browsing and discovering agents
 *
 * Provides tabbed navigation for different agent categories, search, and a
 * detailed agent view through a modal dialog. Category state lives in the URL
 * for deep linking; switching categories swaps the grid with a quick crossfade.
 */
const AgentMarketplace: React.FC<AgentMarketplaceProps> = ({ className = '' }) => {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  const searchQuery = searchParams.get('q') || '';

  const [displayCategory, setDisplayCategory] = useState<string>(category || 'all');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useDocumentTitle(`${localize('com_agents_marketplace')} | IAzzas`);

  // Ensure endpoints config is loaded first (required for agent queries)
  useGetEndpointsQuery();

  const categoriesQuery = useGetAgentCategoriesQuery({
    staleTime: 1000 * 60 * 15, // 15 minutes - categories rarely change
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  // Default to the "promoted" tab when landing on /agents without a category
  useEffect(() => {
    if (
      !category &&
      window.location.pathname === '/agents' &&
      categoriesQuery.data &&
      displayCategory === 'all'
    ) {
      const hasPromoted = categoriesQuery.data.some((cat) => cat.value === 'promoted');
      if (hasPromoted) {
        setDisplayCategory('promoted');
      }
    }
  }, [category, categoriesQuery.data, displayCategory]);

  // Sync display when the URL changes (back/forward, deep link)
  useEffect(() => {
    if (category && category !== displayCategory) {
      setDisplayCategory(category);
    }
  }, [category, displayCategory]);

  const handleAgentSelect = (agent: t.Agent) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('agent_id', agent.id);
    setSearchParams(newParams);
  };

  /** Switch category, preserving any active search params */
  const handleTabChange = (tabValue: string) => {
    if (tabValue === displayCategory) {
      return;
    }
    setDisplayCategory(tabValue);
    const currentSearchParams = searchParams.toString();
    const suffix = currentSearchParams ? `?${currentSearchParams}` : '';
    navigate(tabValue === 'promoted' ? `/agents${suffix}` : `/agents/${tabValue}${suffix}`);
  };

  const handleSearch = (query: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (query.trim()) {
      newParams.set('q', query.trim());
    } else {
      newParams.delete('q');
    }
    const suffix = newParams.toString() ? `?${newParams.toString()}` : '';
    navigate(
      displayCategory === 'promoted' ? `/agents${suffix}` : `/agents/${displayCategory}${suffix}`,
    );
  };

  /** Resolve the slim description shown above the grid for the active category */
  const categoryDescription = useMemo<string>(() => {
    if (displayCategory === 'promoted') {
      return localize('com_agents_recommended');
    }
    if (displayCategory === 'all') {
      return localize('com_agents_all_description');
    }
    const categoryData = categoriesQuery.data?.find((cat) => cat.value === displayCategory);
    if (!categoryData?.description) {
      return '';
    }
    return categoryData.description.startsWith('com_')
      ? localize(categoryData.description as TranslationKeys)
      : categoryData.description;
  }, [displayCategory, categoriesQuery.data, localize]);

  // Press "/" to jump to the search field (ignored while typing)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }
      const input = document.getElementById('agent-search') as HTMLInputElement | null;
      if (input) {
        e.preventDefault();
        input.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const hasAccessToMarketplace = useHasAccess({
    permissionType: PermissionTypes.MARKETPLACE,
    permission: Permissions.USE,
  });
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (!hasAccessToMarketplace) {
      timeoutId = setTimeout(() => {
        navigate('/c/new');
      }, 1000);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [hasAccessToMarketplace, navigate]);

  if (!hasAccessToMarketplace) {
    return null;
  }

  return (
    <div className={`relative flex w-full grow overflow-hidden bg-presentation ${className}`}>
      <SidePanelGroup>
        <main className="flex h-full flex-col overflow-hidden" role="main">
          <div
            ref={scrollContainerRef}
            className="scrollbar-gutter-stable relative flex h-full flex-col overflow-y-auto overflow-x-hidden"
          >
            {/* Hero - desktop only, scrolls away */}
            {!isSmallScreen && (
              <div className="container mx-auto max-w-4xl">
                <div className="mb-8 mt-12 text-center">
                  <h1 className="mb-3 text-3xl font-bold tracking-tight text-text-primary md:text-5xl">
                    {localize('com_agents_marketplace')}
                  </h1>
                  <p className="mx-auto mb-6 max-w-2xl text-lg text-text-secondary">
                    {localize('com_agents_marketplace_subtitle')}
                  </p>
                </div>
              </div>
            )}

            {/* Sticky search bar and categories */}
            <div className="sticky top-0 z-10 bg-presentation pb-4">
              <div className="container mx-auto max-w-4xl px-4">
                {/* Compact title on mobile, where the hero is hidden */}
                {isSmallScreen && (
                  <h1 className="pb-3 pt-4 text-xl font-bold tracking-tight text-text-primary">
                    {localize('com_agents_marketplace')}
                  </h1>
                )}

                <div className="mx-auto flex max-w-2xl gap-2 pb-6">
                  <SearchBar value={searchQuery} onSearch={handleSearch} />
                  {/* TODO: Remove this once we have a better way to handle admin settings */}
                  <MarketplaceAdminSettings />
                </div>

                <CategoryTabs
                  categories={categoriesQuery.data || []}
                  activeTab={displayCategory}
                  isLoading={categoriesQuery.isLoading}
                  onChange={handleTabChange}
                />
              </div>
            </div>

            {/* Grid - wider container than the hero to use horizontal space */}
            <div className="container mx-auto max-w-6xl px-4 pb-8">
              {!searchQuery && categoryDescription && (
                <p className="mb-6 mt-6 text-left text-text-secondary">{categoryDescription}</p>
              )}

              <div
                key={`grid-pane-${displayCategory}-${searchQuery}`}
                className="mt-6 motion-safe:animate-fade-in-fast"
              >
                <AgentGrid
                  category={displayCategory}
                  searchQuery={searchQuery}
                  onSelectAgent={handleAgentSelect}
                  onClearSearch={() => handleSearch('')}
                  scrollElementRef={scrollContainerRef}
                />
              </div>
            </div>
          </div>
        </main>
      </SidePanelGroup>
    </div>
  );
};

export default AgentMarketplace;
