import { renderHook } from '@testing-library/react';
import useUnifiedSidebarLinks from '../useUnifiedSidebarLinks';

// Nota: este hook é um useMemo([],[]) — o teste é um snapshot barato de baixo
// valor. O guard real do rename é o grep do Step 6 + o redirect + Playwright.
describe('useUnifiedSidebarLinks', () => {
  it('aponta o item Flows para /d/flows', () => {
    const { result } = renderHook(() => useUnifiedSidebarLinks());
    const flows = result.current.find((l) => l.id === 'nav-flows');
    expect(flows?.href).toBe('/d/flows');
  });

  it('inclui Agentes apontando /d/agentes, antes de Flows', () => {
    const { result } = renderHook(() => useUnifiedSidebarLinks());
    const links = result.current;
    const agentes = links.find((l) => l.id === 'nav-agentes');
    expect(agentes?.href).toBe('/d/agentes');
    expect(agentes?.title).toBe('com_ui_ux_nav_agentes');
    const i = links.findIndex((l) => l.id === 'nav-agentes');
    const j = links.findIndex((l) => l.id === 'nav-flows');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(j);
  });
});
