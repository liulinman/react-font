import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { ReadingSourceIssueReview } from './ReadingSourceIssueReview';
const source = { id: 'source-1', name: '原稿第42页.jpg', mime: 'image/jpeg', url: '/admin/reading-practices/sources/source-1', size: 100, pages: 1 };
afterEach(cleanup);
it('requires source comparison and explicit evidence, then submits a bound confirmation', async () => {
  const user = userEvent.setup(), verify = vi.fn().mockResolvedValue(true);
  render(<ReadingSourceIssueReview sources={[source]} disabled={false} onVerify={verify} onSupplement={vi.fn()} />);
  await user.click(screen.getByText('核对原稿文字'));
  expect(screen.getByRole('img', { name: '核对原稿：原稿第42页.jpg' })).toHaveAttribute('src', '/api/admin/reading-practices/sources/source-1');
  expect(screen.getByRole('button', { name: '确认与原稿一致' })).toBeDisabled();
  await user.type(screen.getByLabelText('核对说明'), '已核对原稿，保留印刷拼写');
  await user.type(screen.getByLabelText('原稿依据'), '第42页右栏印为 Alassk');
  expect(screen.getByRole('button', { name: '确认与原稿一致' })).toBeDisabled();
  await user.click(screen.getByRole('checkbox', { name: '我已查看所选原稿，确认当前文字与原稿一致' }));
  await user.click(screen.getByRole('button', { name: '确认与原稿一致' }));
  await waitFor(() => expect(verify).toHaveBeenCalledWith({ sourceId: 'source-1', reason: '已核对原稿，保留印刷拼写', evidence: '第42页右栏印为 Alassk' }));
});
it('requires uploading original when no source exists and respects pending edits', async () => {
  const user = userEvent.setup(), supplement = vi.fn();
  const { rerender } = render(<ReadingSourceIssueReview sources={[]} disabled={false} onVerify={vi.fn()} onSupplement={supplement} />);
  await user.click(screen.getByText('核对原稿文字'));
  expect(screen.queryByRole('button', { name: '确认与原稿一致' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '补充原稿' })); expect(supplement).toHaveBeenCalledOnce();
  rerender(<ReadingSourceIssueReview sources={[source]} disabled onVerify={vi.fn()} onSupplement={supplement} />);
  expect(screen.getByLabelText('核对说明')).toBeDisabled();
});
