import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { MobileAccountPage } from './MobileAccountPage';

const logout = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'learner' }, logout }),
}));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

function mount() {
  render(<MemoryRouter initialEntries={['/mobile/me']}><Routes>
    <Route path="/mobile/me" element={<MobileAccountPage />} />
    <Route path="/login" element={<p>登录页面</p>} />
  </Routes></MemoryRouter>);
}

it('shows the signed-in account and returns to login after successful logout', async () => {
  logout.mockResolvedValue(undefined);
  mount();
  expect(screen.getByText('learner')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: '退出登录' }));
  expect(await screen.findByText('登录页面')).toBeVisible();
  expect(logout).toHaveBeenCalledOnce();
});

it('keeps the account visible and offers retry when the server cannot clear the session', async () => {
  logout.mockRejectedValue(new Error('offline'));
  mount();
  await userEvent.click(screen.getByRole('button', { name: '退出登录' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('退出失败，请检查网络后重试');
  expect(screen.getByText('learner')).toBeVisible();
  expect(screen.getByRole('button', { name: '退出登录' })).toBeEnabled();
});
