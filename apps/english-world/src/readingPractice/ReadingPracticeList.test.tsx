import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ReadingPracticeList } from "./ReadingPracticeList";
const send=vi.hoisted(()=>vi.fn());
vi.mock("@font/api",()=>({default:send}));
vi.mock("./ReadingLearningRecords",()=>({ReadingLearningRecords:()=> <p>学习记录保留</p>}));
const paper={id:1,title:'Sweet Trouble',ieltsBand:null,questionCount:13,status:'published',submitted:false};
beforeEach(()=>{Object.defineProperty(window,'matchMedia',{writable:true,value:vi.fn(()=>({matches:false,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn()}))});});
afterEach(()=>{cleanup();vi.clearAllMocks();});
function mount(path='/reading') {return render(<MemoryRouter initialEntries={[path]}><ReadingPracticeList basePath="/reading" /></MemoryRouter>);}
it('confirms removal, persists selected view and restores without deleting records',async()=>{
 let removed=false;
 send.mockImplementation(async (r:any)=>{
  if(r.url.endsWith('/remove')) {removed=true;return {practiceId:1,removed:true};}
  if(r.url.endsWith('/restore')) {removed=false;return {practiceId:1,removed:false};}
  const visible=(r.data?.view==='removed')===removed; return {list:visible?[paper]:[],total:visible?1:0};
 });
 const user=userEvent.setup();mount();await screen.findByText('Sweet Trouble');
 await user.click(screen.getByRole('button',{name:'移除 Sweet Trouble'}));
 expect(send.mock.calls.filter(([r])=>r.method==='POST')).toHaveLength(0);
 expect(screen.getByRole('dialog')).toHaveTextContent('学习记录仍会保留');
 await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:/取\s*消/}));
 expect(removed).toBe(false);
 await user.click(screen.getByRole('button',{name:'移除 Sweet Trouble'}));
 await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:/确认移除/}));
 await screen.findByText('还没有收到练习');
 await user.click(screen.getByRole('button',{name:'已移除'}));
 await screen.findByText('Sweet Trouble');
 expect(screen.getByText('学习记录保留')).toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'恢复 Sweet Trouble'}));
 await screen.findByText('没有已移除的练习');
 expect(removed).toBe(false);
});
it('keeps a failed operation retryable with the original item still present',async()=>{
 send.mockImplementation(async (r:any)=>{if(r.method==='POST')throw Error('offline');return {list:[paper],total:1};});
 const user=userEvent.setup();mount();await screen.findByText('Sweet Trouble');
 await user.click(screen.getByRole('button',{name:'移除 Sweet Trouble'}));
 await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:/确认移除/}));
 await waitFor(()=>expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('操作未完成'));
 expect(screen.getAllByText('Sweet Trouble').length).toBeGreaterThan(0);
});
it('loads the removed view from its URL and clamps an emptied last page',async()=>{
 let removed=false;
 send.mockImplementation(async (r:any)=>{
  if(r.method==='POST'){removed=true;return {};}
  if(r.data.page===2)return {list:removed?[]:[paper],total:removed?12:13};
  return {list:[{...paper,id:2,title:'Other'}],total:removed?12:13};
 });
 const user=userEvent.setup();mount('/reading?view=removed');await screen.findByText('Other');
 expect(send).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({view:'removed'})}));
 await user.click(screen.getByRole('button',{name:'下一页'}));await screen.findByText('Sweet Trouble');
 await user.click(screen.getByRole('button',{name:'恢复 Sweet Trouble'}));
 await waitFor(()=>expect(screen.getByText('Other')).toBeInTheDocument());
 expect(send).toHaveBeenLastCalledWith(expect.objectContaining({data:expect.objectContaining({page:1,view:'removed'})}));
});
