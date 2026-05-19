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
});
