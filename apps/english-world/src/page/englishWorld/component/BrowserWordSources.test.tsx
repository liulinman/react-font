import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import request from '@font/api';
import { useColumns } from '../useColumns';
import { BrowserSourceLink, BrowserWordSources } from './BrowserWordSources';

vi.mock('@font/api', () => ({ default: vi.fn() }));
afterEach(cleanup);

it('adds the webpage field beside the existing table reference', () => {
  const { columns } = useColumns({ page: 1, pageSize: 10, handleEdit: vi.fn(), handleDelete: vi.fn() });
  const index = columns?.findIndex((column) => column.key === 'englishReference') ?? -1;
  const column = columns?.[index + 1];
  expect(index).toBeGreaterThanOrEqual(0);
  expect(column).toMatchObject({ title: '来源链接', dataIndex: 'sourceUrl' });
  if (!column || !('render' in column)) throw new Error('Expected a source link column renderer');

  const sourceUrl = 'https://news.example/article?id=42#finance';
  render(<>{column.render?.(sourceUrl, { id: 1, englishWord: 'bank', sourceUrl }, 0)}</>);
  expect(screen.getByRole('link', { name: '打开原文' })).toHaveAttribute('href', sourceUrl);
});

it('opens the saved URL and leaves unsafe or missing URLs unlinked', () => {
  const url = 'https://news.example/article?id=42#finance';
  const { rerender } = render(<BrowserSourceLink url={url} />);
  expect(screen.getByRole('link', { name: '打开原文' })).toHaveAttribute('href', url);
  expect(screen.getByRole('link', { name: '打开原文' })).toHaveAttribute('target', '_blank');

  for (const invalid of ['javascript:alert(1)', 'https://user:password@news.example/', null]) {
    rerender(<BrowserSourceLink url={invalid} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  }
});

it('shows independent sentences and safe links for the same word', async () => {
  vi.mocked(request).mockResolvedValue([
    { id: 1, sentence: 'I went to the bank.', sentenceTranslation: '我去了银行。', meaning: '银行', title: 'Money', url: 'https://news.example/money' },
    { id: 2, sentence: 'We sat on the river bank.', meaning: '河岸', title: null, url: 'https://travel.example/river#walk' },
  ]);
  render(<BrowserWordSources wordId={7} />);
  expect(await screen.findByRole('link', { name: 'Money' })).toHaveAttribute('href', 'https://news.example/money');
  expect(screen.getByRole('link', { name: 'travel.example' })).toHaveAttribute('href', 'https://travel.example/river#walk');
  expect(screen.getByText('河岸')).toBeVisible();
  expect(screen.getByText('We sat on the river bank.')).toBeVisible();
  expect(screen.getByText('整句译文：我去了银行。')).toBeVisible();
  expect(screen.getByText('https://news.example/money')).toBeVisible();
});
