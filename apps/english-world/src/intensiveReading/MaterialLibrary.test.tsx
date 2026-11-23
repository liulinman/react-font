import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import MaterialLibrary from './MaterialLibrary';
import { listMaterials, createMaterial } from './api';
vi.mock('./api',()=>({ listMaterials:vi.fn(), createMaterial:vi.fn(), requestId:()=>String(Math.random()) }));
afterEach(()=>{cleanup();vi.resetAllMocks();});
function mount(){render(<RouterProvider router={createMemoryRouter([{path:'/',element:<MaterialLibrary/>},{path:'/englishWorld/intensive-reading/:id/review',element:<div>Created</div>}])}/>);}
it('shows loading, coalesces quick title input, distinguishes no matches and allows local retry',async()=>{
 let finish!:(v:any)=>void;
 vi.mocked(listMaterials).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce({list:[],total:0}).mockRejectedValueOnce(new Error('Temporary failure')).mockResolvedValueOnce({list:[],total:0});
 mount();expect(screen.queryByText('还没有精读材料，导入一篇文章开始。')).toBeNull();expect(screen.getByRole('status').textContent).toContain('加载');
 await waitFor(()=>expect(listMaterials).toHaveBeenCalledTimes(1));finish({list:[],total:0});
 await screen.findByText('还没有精读材料，导入一篇文章开始。');
 const search=screen.getByRole('textbox',{name:'搜索精读材料'});fireEvent.change(search,{target:{value:'a'}});fireEvent.change(search,{target:{value:'article'}});
 await screen.findByText('没有找到匹配的文章，试试其他标题。');expect(listMaterials).toHaveBeenCalledTimes(2);
 fireEvent.change(search,{target:{value:'offline'}});await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'重试加载'}));await screen.findByText('没有找到匹配的文章，试试其他标题。');expect(listMaterials).toHaveBeenCalledTimes(4);
});
it('freezes the submitted import fields until creation finishes',async()=>{
 vi.mocked(listMaterials).mockResolvedValue({list:[],total:0});vi.mocked(createMaterial).mockImplementation(()=>new Promise(()=>{}));mount();
 fireEvent.click(screen.getByRole('button',{name:'＋ 导入材料'}));fireEvent.click(screen.getByRole('button',{name:'粘贴文章'}));
 fireEvent.change(screen.getByLabelText('文章原文'),{target:{value:'Original paragraph'}});fireEvent.click(screen.getByRole('button',{name:'整理并校对 →'}));
 expect((screen.getByLabelText('文章原文') as HTMLTextAreaElement).disabled).toBe(true);expect((screen.getByLabelText('文章标题') as HTMLInputElement).disabled).toBe(true);
 expect((screen.getByRole('button',{name:'PDF / 照片'}) as HTMLButtonElement).disabled).toBe(true);
});
it('keeps the same retry identity when clicking the already selected source after a lost response',async()=>{
 vi.mocked(listMaterials).mockResolvedValue({list:[],total:0});vi.mocked(createMaterial).mockRejectedValueOnce(new Error('response lost')).mockResolvedValueOnce({id:'created'} as any);mount();
 fireEvent.click(screen.getByRole('button',{name:'＋ 导入材料'}));fireEvent.click(screen.getByRole('button',{name:'粘贴文章'}));fireEvent.change(screen.getByLabelText('文章原文'),{target:{value:'Original paragraph'}});
 fireEvent.click(screen.getByRole('button',{name:'整理并校对 →'}));await screen.findByText('response lost',{selector:'.ir-modal p'});
 fireEvent.click(screen.getByRole('button',{name:'粘贴文章'}));fireEvent.click(screen.getByRole('button',{name:'整理并校对 →'}));await screen.findByText('Created');
 expect((vi.mocked(createMaterial).mock.calls[0][0] as any).requestId).toBe((vi.mocked(createMaterial).mock.calls[1][0] as any).requestId);
});
