import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import ReadingWorkbench from './ReadingWorkbench';
import { changeMaterial } from './api';
import type { Material } from './types';
vi.mock('./api', () => ({ changeMaterial: vi.fn(), requestId: () => 'request', readMaterial: vi.fn() }));
Element.prototype.scrollIntoView = vi.fn();
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const material = {
  updatedAt: '2026-11-03', id: 'inline', title: 'Reading', status: 'ready', version: 1, sourceType: 'text',
  originalText: 'First phrase. Second phrase.', sources: [], activeBodyVersionId: 'v1', uncertainties: [], progress: null,
  paragraphs: [{ id: 'p', text: 'First phrase. Second phrase.' }],
  annotations: ['First', 'Second'].map((quote, index) => ({ id: `a${index}`, bodyVersionId: 'v1', paragraphId: 'p', start: index ? 14 : 0, end: index ? 20 : 5,
    quote, color: 'blue', category: '', note: `${quote} note`, isQuestion: true, resolved: false, anchorStatus: 'active', version: 1 })),
} as Material;
function mount() {
  function Harness() { const [current, setCurrent] = useState(material); return <ReadingWorkbench material={current} onChange={setCurrent} />; }
  return render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <Harness /> }])} />);
}
it('edits the chosen note in place and keeps its filter, then returns focus on close', () => {
  const { container } = mount();
  fireEvent.click(screen.getByRole('button', { name: '语言积累 2' }));
  const row = container.querySelector('#ir-note-a1')!;
  fireEvent.click(within(row as HTMLElement).getByRole('button', { name: '编辑标注' }));
  expect(row.contains(screen.getByRole('textbox', { name: '笔记内容' }))).toBe(true);
  expect(screen.getByRole('button', { name: '语言积累 2' }).className).toContain('ir-selected');
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: '笔记内容' }));
  fireEvent.click(screen.getByRole('button', { name: '收起' }));
  expect(document.activeElement).toBe(within(row as HTMLElement).getByRole('button', { name: '编辑标注' }));
});
it('keeps an edited question visible after autosave changes its filter membership and shows retry locally', async () => {
  vi.mocked(changeMaterial).mockRejectedValueOnce(new Error('暂时无法保存')).mockImplementationOnce(async (_id, _path, value) => ({ ...material, version: 2,
    annotations: material.annotations.map(a => a.id === 'a1' ? { ...a, ...(value as Record<string, unknown>), version: 2 } : a) }));
  const { container } = mount();
  fireEvent.click(screen.getByRole('button', { name: '待解决 2' }));
  const row = container.querySelector('#ir-note-a1')! as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: '编辑标注' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '已解决' }));
  fireEvent.click(screen.getByRole('button', { name: '保存笔记' }));
  await waitFor(() => expect(within(row).getByRole('alert').textContent).toContain('暂时无法保存'));
  expect(screen.getByRole('checkbox', { name: '已解决' })).toHaveProperty('checked', true);
  fireEvent.click(within(row).getByRole('button', { name: '重试保存' }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect(row.contains(screen.getByRole('textbox', { name: '笔记内容' }))).toBe(true);
  expect(screen.getByRole('button', { name: '待解决 1' }).className).toContain('ir-selected');
  fireEvent.click(screen.getByRole('button', { name: '收起' }));
  expect(container.querySelector('#ir-note-a1')).toBeNull();
});
it('keeps focus, caret and newer text through a slow autosave and subsequently saves the latest draft', async () => {
  let finish!: (value: Material) => void;
  vi.mocked(changeMaterial).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockImplementation(async (_id, _path, value) => ({ ...material, version: 3, annotations: material.annotations.map(a => a.id === 'a1' ? { ...a, ...(value as Record<string, unknown>), version: 3 } : a) }));
  const { container } = mount();
  fireEvent.click(within(container.querySelector('#ir-note-a1')! as HTMLElement).getByRole('button', { name: '编辑标注' }));
  const input = screen.getByRole('textbox', { name: '笔记内容' }) as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: 'First draft' } });
  fireEvent.click(screen.getByRole('button', { name: '保存笔记' }));
  expect(input.disabled).toBe(false);
  fireEvent.change(input, { target: { value: 'First newer draft' } });
  input.setSelectionRange(6, 6);
  finish({ ...material, version: 2, annotations: material.annotations.map(a => a.id === 'a1' ? { ...a, note: 'First draft' } : a) });
  await waitFor(() => expect(changeMaterial).toHaveBeenCalledTimes(2), { timeout: 2500 });
  expect(input.value).toBe('First newer draft');
  expect(document.activeElement).toBe(input);
  expect(input.selectionStart).toBe(6);
  expect(vi.mocked(changeMaterial).mock.calls[1][2]).toMatchObject({ note: 'First newer draft', expectedVersion: 2 });
});
it('does not autosave an unfinished Chinese composition', async () => {
  vi.mocked(changeMaterial).mockResolvedValue(material);
  const { container } = mount();
  fireEvent.click(within(container.querySelector('#ir-note-a1')! as HTMLElement).getByRole('button', { name: '编辑标注' }));
  const input = screen.getByRole('textbox', { name: '笔记内容' });
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: '中文输入' } });
  await new Promise(resolve => setTimeout(resolve, 950));
  expect(changeMaterial).not.toHaveBeenCalled();
  fireEvent.compositionEnd(input);
  await waitFor(() => expect(changeMaterial).toHaveBeenCalledTimes(1), { timeout: 2000 });
});
it('starts with original paragraphs and keeps font controls in the workbench toolbar', () => {
  const { container } = mount();
  expect(container.querySelector('.ir-reader h1')).toBeNull();
  expect(screen.queryByText('READ CLOSELY · THINK DEEPLY')).toBeNull();
  expect(container.querySelector('.ir-reader-tools')).toBeNull();
  const header = container.querySelector('.ir-workbench-header')! as HTMLElement;
  fireEvent.click(within(header).getByRole('button', { name: '放大正文字号' }));
  expect((container.querySelector('.ir-reader') as HTMLElement).style.fontSize).toBe('21px');
});
it('does not recompute article word segments for each note keystroke', async () => {
  const anchors = await import('./annotationAnchors');
  const compute = vi.spyOn(anchors, 'segments');
  const { container } = mount();
  fireEvent.click(within(container.querySelector('#ir-note-a1')! as HTMLElement).getByRole('button', { name: '编辑标注' }));
  compute.mockClear();
  fireEvent.change(screen.getByRole('textbox', { name: '笔记内容' }), { target: { value: 'A new draft' } });
  expect(compute).not.toHaveBeenCalled();compute.mockRestore();
});
it('retains a queued reading position while a note save is in flight and saves it when idle', async () => {
  let finish!: (value: Material) => void;
  vi.mocked(changeMaterial).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockImplementation(async (_id, _path, data) => ({ ...material, version: 3, progress: data as Material['progress'] }));
  const { container } = mount();
  const reader = container.querySelector('.ir-reader')! as HTMLElement;
  const paragraph = reader.querySelector('.ir-paragraph')! as HTMLElement;
  reader.getBoundingClientRect = () => ({top:0,bottom:600,height:600} as DOMRect);
  paragraph.getBoundingClientRect = () => ({top:-100,bottom:400,height:500} as DOMRect);
  paragraph.getClientRects = () => [{top:-100,bottom:400,height:500} as DOMRect] as unknown as DOMRectList;
  fireEvent.click(within(container.querySelector('#ir-note-a1')! as HTMLElement).getByRole('button', { name: '编辑标注' }));
  fireEvent.change(screen.getByRole('textbox', { name: '笔记内容' }), { target: { value: 'Saved draft' } });
  fireEvent.click(screen.getByRole('button', { name: '保存笔记' }));
  fireEvent.scroll(reader);
  await new Promise(resolve => setTimeout(resolve, 1650));
  expect(changeMaterial).toHaveBeenCalledTimes(1);
  finish({ ...material, version: 2 });
  await waitFor(() => expect(changeMaterial).toHaveBeenCalledTimes(2));
  expect(vi.mocked(changeMaterial).mock.calls[1]).toEqual(['inline','progress',expect.objectContaining({paragraphId:'p',ratio:0.2,expectedVersion:2}),'PUT']);
});
