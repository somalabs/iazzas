import { render } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { rehypeRenderRawHtml } from './html';

const renderMd = (content: string) =>
  render(
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRenderRawHtml]}>
      {content}
    </ReactMarkdown>,
  );

describe('rehypeRenderRawHtml', () => {
  it('renders an HTML block as real DOM with inline styles preserved', () => {
    const content = `<h2>📊 Resultado</h2>\n<table border="1" cellpadding="8"><tbody><tr><td style="color: green; font-weight: bold;">137,8%</td></tr></tbody></table>`;
    const { container } = renderMd(content);

    expect(container.querySelector('table')).toBeInTheDocument();
    expect(container.querySelector('h2')?.textContent).toContain('Resultado');
    expect(container.querySelector('td')?.getAttribute('style')).toContain('color: green');
    expect(container.innerHTML).not.toContain('&lt;table');
  });

  it('strips scripts, event handlers, and javascript: URLs', () => {
    const content = `<div>safe</div><script>window.__pwned = 1</script><img src="x" onerror="window.__pwned = 1"><a href="javascript:alert(1)">bad</a>`;
    const { container } = renderMd(content);

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('onerror')).toBeNull();
    expect(container.querySelector('a')?.getAttribute('href') ?? '').not.toContain('javascript:');
    expect(container.textContent).toContain('safe');
  });

  it('leaves normal markdown untouched', () => {
    const content = `# Heading\n\nNormal **markdown** with a list:\n\n- one\n- two`;
    const { container } = renderMd(content);

    expect(container.querySelector('h1')?.textContent).toBe('Heading');
    expect(container.querySelector('strong')?.textContent).toBe('markdown');
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });
});
