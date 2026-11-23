import {useState} from 'react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {createMemoryRouter,RouterProvider} from 'react-router-dom';
import ImportReview from './ImportReview';
import {changeMaterial} from './api';
import type {Material} from './types';
vi.mock('./api',()=>({changeMaterial:vi.fn(),requestId:()=>crypto.randomUUID(),readMaterial:vi.fn(),sourceUrl:vi.fn(),uploadSource:vi.fn(),readVersions:vi.fn()}));
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const material={id:'m1',title:'Birds',status:'ready',version:1,sourceType:'text',originalText:'Birds fly.',sources:[],activeBodyVersionId:'v1',uncertainties:[],progress:null,paragraphs:[{id:'p1',text:'Birds fly.',role:'body'}],annotations:[],updatedAt:'2026-11-03'} as Material;
function mount(){function Review(){const [m,setM]=useState(material);return <ImportReview material={m} onChange={setM}/>;}const router=createMemoryRouter([{path:'/review',element:<Review/>},{path:'/englishWorld/intensive-reading/:id',element:<div>Reading workbench</div>}],{initialEntries:['/review']});render(<RouterProvider router={router}/>);return router;}
describe('review confirmation navigation',()=>{
 it('waits for the persistence blocker to clear before navigating after a delayed successful confirmation',async()=>{
  let finish!:(value:Material)=>void;vi.mocked(changeMaterial).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);mount();
  fireEvent.change(screen.getByLabelText('段落 1'),{target:{value:'Birds can fly.'}});fireEvent.click(screen.getByRole('button',{name:'确认正文，开始精读 →'}));expect((screen.getByLabelText('段落 1') as HTMLTextAreaElement).disabled).toBe(true);expect(screen.queryByText('Reading workbench')).toBeNull();
  await act(async()=>finish({...material,version:2}));await waitFor(()=>expect(screen.getByText('Reading workbench')).toBeTruthy());expect(confirm).not.toHaveBeenCalled();
 });
 it('keeps edited text and stays in review when confirmation fails',async()=>{
  vi.mocked(changeMaterial).mockRejectedValueOnce(new Error('Service unavailable'));const router=mount();fireEvent.change(screen.getByLabelText('段落 1'),{target:{value:'Keep my edit.'}});fireEvent.click(screen.getByRole('button',{name:'确认正文，开始精读 →'}));await waitFor(()=>expect(screen.getByText('Service unavailable')).toBeTruthy());expect(router.state.location.pathname).toBe('/review');expect((screen.getByLabelText('段落 1') as HTMLTextAreaElement).value).toBe('Keep my edit.');
 });
});
