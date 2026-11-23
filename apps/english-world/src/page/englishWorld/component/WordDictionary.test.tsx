import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WordDictionary } from './WordDictionary';
vi.mock('./BrowserWordSources', async (importOriginal) => ({
  ...await importOriginal<typeof import('./BrowserWordSources')>(),
  BrowserWordSources: () => null,
}));
vi.mock('./BritishPronunciationButton',()=>({BritishPronunciationButton:()=> <button>发音</button>}));
vi.mock('./WordLevelQuickEdit',()=>({WordLevelQuickEdit:()=> <button>掌握程度</button>}));
afterEach(cleanup);
const words=[{id:1,englishWord:'income',englishChinese:'收入',englishNote:'完整笔记',englishReference:'课堂来源',englishOverwriteCount:3,englishCreateTime:'2026-10-20',englishUpdateTime:'2026-10-27',englishPartSpeech:[2],englishType:1},{id:2,englishWord:'profit',englishChinese:'利润'}];
describe('WordDictionary',()=>{it('selects an entry and keeps its complete data and actions',()=>{const edit=vi.fn();render(<MemoryRouter><WordDictionary words={words} loading={false} selectedIds={[]} onSelect={vi.fn()} onEdit={edit} onDelete={vi.fn()} onLevel={vi.fn()} updatingIds={[]} /></MemoryRouter>);expect(screen.queryByRole('table')).not.toBeInTheDocument();expect(screen.getByText('完整笔记')).toBeVisible();expect(screen.getByText('课堂来源')).toBeVisible();expect(screen.getByText('3 次')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'编辑词条'}));expect(edit).toHaveBeenCalledWith(words[0],false);fireEvent.click(screen.getByRole('button',{name:'查看 profit'}));expect(screen.getByRole('heading',{name:'profit'})).toBeVisible();expect(screen.queryByText('完整笔记')).not.toBeInTheDocument();});});

it('shows the saved webpage separately from the selected word’s reference', () => {
  const url = 'https://news.example/story?id=7#reading';
  render(<MemoryRouter><WordDictionary
    words={[{ ...words[0], sourceUrl: url }, words[1]]}
    loading={false}
    selectedIds={[]}
    onSelect={vi.fn()}
    onEdit={vi.fn()}
    onDelete={vi.fn()}
    onLevel={vi.fn()}
    updatingIds={[]}
  /></MemoryRouter>);

  expect(screen.getByText('来源链接')).toBeVisible();
  expect(screen.getByText('课堂来源')).toBeVisible();
  expect(screen.getByRole('link', { name: '打开原文' })).toHaveAttribute('href', url);
  fireEvent.click(screen.getByRole('button', { name: '查看 profit' }));
  expect(screen.queryByRole('link', { name: '打开原文' })).not.toBeInTheDocument();
});
