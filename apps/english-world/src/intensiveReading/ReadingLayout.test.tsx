import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import ReadingWorkbench from './ReadingWorkbench';
import ImportReview from './ImportReview';
import type { Material } from './types';
afterEach(cleanup);
const material = {id:'m1',updatedAt:'2026-10-22',title:'Birds',status:'ready',version:1,sourceType:'text',originalText:'original',sources:[],activeBodyVersionId:'v1',uncertainties:[],progress:null,paragraphs:[{id:'body',text:'Birds evolved from dinosaurs.',role:'body'},{id:'questions',text:'Questions 1 – 5',role:'exercise'},{id:'instruction',text:'Complete the sentences below.',role:'instruction'}],annotations:[{id:'note1',bodyVersionId:'v1',paragraphId:'body',start:0,end:5,quote:'Birds',note:'unchanged',color:'blue',category:'',isQuestion:false,resolved:false,anchorStatus:'active',version:1},{id:'note2',bodyVersionId:'v1',paragraphId:'questions',start:0,end:9,quote:'Questions',note:'exercise note',color:'yellow',category:'',isQuestion:false,resolved:false,anchorStatus:'active',version:1}]} as Material;
function mount(Component: typeof ReadingWorkbench) {render(<RouterProvider router={createMemoryRouter([{path:'/',element:<Component material={material} onChange={vi.fn()}/>}])}/>);}
describe('reading content layout',()=>{
 it('keeps exercises out of the article navigation and collapses supplementary originals',()=>{
  mount(ReadingWorkbench);
  expect(within(document.querySelector('.ir-toc')!).queryByText(/Questions 1/)).toBeNull();
  const appendix = document.querySelector<HTMLDetailsElement>('.ir-supplement')!;
  expect(appendix).not.toBeNull(); expect(appendix.open).toBe(false);
  expect(appendix.textContent).toContain('Complete the sentences below.');
  expect(document.querySelector('.ir-dek')?.textContent).toContain('1 个段落');
  expect(document.querySelector('#ir-a-note1')?.textContent).toBe('Birds');
 });
 it('opens supplementary content when locating an existing exercise note',()=>{
  Element.prototype.scrollIntoView = vi.fn(); Element.prototype.animate = vi.fn();
  mount(ReadingWorkbench);
  fireEvent.click(screen.getByRole('button',{name:'Questions'}));
  expect(document.querySelector<HTMLDetailsElement>('.ir-supplement')?.open).toBe(true);
  expect(document.querySelector('#ir-a-note2')?.textContent).toBe('Questions');
 });
 it('allows changing content role without changing its text or paragraph identity',()=>{
  mount(ImportReview);
  const select=screen.getByLabelText('内容归属 2') as HTMLSelectElement;
  expect(select.value).toBe('exercise');
  fireEvent.change(select,{target:{value:'body'}});
  expect(select.value).toBe('body');
  expect((screen.getByLabelText('段落 2') as HTMLTextAreaElement).value).toBe('Questions 1 – 5');
 });
});
