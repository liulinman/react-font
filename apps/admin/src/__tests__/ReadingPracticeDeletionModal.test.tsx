import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReadingPracticeDeletionModal } from '../ReadingPracticeDeletionModal';
const send = vi.hoisted(() => vi.fn());
vi.mock('@font/api', () => ({ default: send }));
const preview = (scope = 'current', token = 'token-1') => ({ scope, confirmationToken: token, practiceIds: scope === 'family' ? [1, 2] : [1], versions: [{ id: 1, title: 'Birds', version: 1, status: 'withdrawn' }], counts: { practices: scope === 'family' ? 2 : 1, assignments: 2, submissions: 1, notifications: 1, receipts: 2, events: 3, runs: 1, sources: 1, sharedSources: 1 } });
beforeEach(() => { Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) }); send.mockImplementation(async r => r.method === 'GET' ? preview(r.data.scope) : ({ deleted: true, practiceIds: [1], sourceCleanup: { pending: false } })); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('requires loaded impact and acknowledgement; cancel never deletes', async () => {
 const close = vi.fn(); const user = userEvent.setup(); render(<ReadingPracticeDeletionModal id={1} onClose={close} onDeleted={vi.fn()} />);
 expect(screen.getByRole('button', { name: /永久删除$/ })).toBeDisabled(); await screen.findByText('答卷及成绩：1'); expect(screen.getByRole('button', { name: /永久删除$/ })).toBeDisabled();
 await user.click(screen.getByRole('button', { name: /取\s*消/ })); expect(close).toHaveBeenCalled(); expect(send.mock.calls.every(([r]) => r.method === 'GET')).toBe(true);
});
it('refreshes scope and token and requires reconfirmation after failure', async () => {
 const done = vi.fn(); let fail = true; const user = userEvent.setup();
 send.mockImplementation(async r => { if (r.method === 'GET') return preview(r.data.scope, fail ? 'old' : 'fresh'); if (fail) { fail = false; throw { code: 409, message: '范围已变化' }; } return { deleted: true, practiceIds: [1,2], sourceCleanup: { pending: true } }; });
 render(<ReadingPracticeDeletionModal id={1} onClose={vi.fn()} onDeleted={done} />);
 await screen.findByText('答卷及成绩：1'); await user.click(screen.getByRole('radio', { name: /所有版本/ })); await screen.findByText('练习版本：2');
 await user.click(screen.getByRole('checkbox', { name: /我已了解/ })); await user.click(screen.getByRole('button', { name: /永久删除$/ }));
 await screen.findByText(/删除未完成/); await waitFor(() => expect(screen.getByRole('button', { name: /永久删除$/ })).toBeDisabled()); await waitFor(() => expect(screen.getByRole('checkbox', { name: /我已了解/ })).toBeEnabled()); expect(screen.getByRole('checkbox', { name: /我已了解/ })).not.toBeChecked(); expect(done).not.toHaveBeenCalled(); expect(send.mock.calls.filter(([r]) => r.method === 'DELETE')).toHaveLength(1);
 await user.click(screen.getByRole('checkbox', { name: /我已了解/ })); await user.click(screen.getByRole('button', { name: /永久删除$/ })); await waitFor(() => expect(done).toHaveBeenCalled());
 expect(send.mock.calls.filter(([r]) => r.method === 'DELETE')[1][0].data).toEqual({ scope: 'family', confirmationToken: 'fresh', confirmed: true });
});
it('keeps deletion blocked on preview failure until successful explicit reload', async () => {
 let first = true; send.mockImplementation(async r => { if(first) { first = false; throw Error('offline'); } return preview(r.data.scope); });
 const user = userEvent.setup(); render(<ReadingPracticeDeletionModal id={1} onClose={vi.fn()} onDeleted={vi.fn()} />);
 await screen.findByText('删除范围加载失败，请重新加载。'); expect(screen.getByRole('button', {name:'永久删除'})).toBeDisabled();
 await user.click(screen.getByRole('button', {name:'重新加载删除范围'})); await screen.findByText('答卷及成绩：1'); expect(screen.getByRole('button', {name:'永久删除'})).toBeDisabled();
});
it('ignores a delayed current preview after switching to all versions', async () => {
 let resolveOld: (value: any) => void = () => {};
 send.mockImplementation(r => r.data.scope === 'current' ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve(preview('family', 'family-token')));
 const user = userEvent.setup(); render(<ReadingPracticeDeletionModal id={1} onClose={vi.fn()} onDeleted={vi.fn()} />);
 await user.click(screen.getByRole('radio', {name:/所有版本/})); await screen.findByText('练习版本：2');
 resolveOld(preview()); await waitFor(() => expect(screen.getByText('练习版本：2')).toBeInTheDocument()); expect(screen.queryByText('练习版本：1')).not.toBeInTheDocument();
});

it('shows the server reason when ownership prevents a deletion preview', async () => {
 send.mockRejectedValue({code:409,message:'通知被其他练习共用，无法安全删除，请联系管理员'});
 render(<ReadingPracticeDeletionModal id={1} onClose={vi.fn()} onDeleted={vi.fn()} />);
 expect(await screen.findByText(/通知被其他练习共用/)).toBeInTheDocument();
 expect(screen.getByRole('button', {name:'永久删除'})).toBeDisabled();
});

it('keeps scope selected when acknowledgement changes and resets only acknowledgement when scope changes', async () => {
 const user = userEvent.setup(); render(<ReadingPracticeDeletionModal id={1} onClose={vi.fn()} onDeleted={vi.fn()} />);
 await screen.findByText('答卷及成绩：1');
 const all = screen.getByRole('radio', {name:/所有版本/});
 await user.click(all); await screen.findByText('练习版本：2');
 const ack = screen.getByRole('checkbox', {name:/我已了解/});
 await user.click(ack); expect(all).toBeChecked(); expect(ack).toBeChecked();
 await user.click(ack); expect(all).toBeChecked(); expect(ack).not.toBeChecked();
 await user.click(ack); await user.click(screen.getByRole('radio', {name:/仅当前版本/}));
 await screen.findByText('练习版本：1'); expect(ack).not.toBeChecked(); expect(screen.getByRole('radio', {name:/仅当前版本/})).toBeChecked();
 expect(send.mock.calls.every(([r]) => r.method === 'GET')).toBe(true);
});
