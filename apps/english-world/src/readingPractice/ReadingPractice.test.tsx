import '@testing-library/jest-dom/vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {ReadingPracticeReader} from './ReadingPracticeReader';
const send=vi.hoisted(()=>vi.fn());vi.mock('@font/api',()=>({default:send}));
const questions=[1,2,3].map(n=>({id:`q${n}`,kind:'choice' as const,stem:`Question ${n}`,options:['Food','Cars','Oil']}));
const paper={id:1,title:'Garden study',paragraphs:['Gardens help communities.'],ieltsBand:6,status:'published',submitted:false,questions};
afterEach(()=>{cleanup();localStorage.clear();vi.clearAllMocks();});
it('requires all answers and reveals explanations only after submission',async()=>{
 let writes=0;send.mockImplementation(async(r:{url:string;method:string})=>{if(r.method==='POST'){writes++;return {practiceId:1,submittedAt:'2026-10-12T00:00:00Z',score:100,correctCount:3,total:3,results:questions.map(q=>({...q,selectedIndex:0,correctIndex:0,correct:true,explanation:'原文解释。',evidence:{paragraph:1,quote:'Gardens'}}))};}return paper;});
 const user=userEvent.setup();render(<MemoryRouter><ReadingPracticeReader practiceId={1} basePath="/reading" userId={7}/></MemoryRouter>);
 await screen.findByText('Garden study');expect(screen.queryByText('原文解释。')).not.toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'提交答案'}));expect(writes).toBe(0);expect(screen.getByRole('alert')).toHaveTextContent('第 1 题');
 for(const radio of screen.getAllByRole('radio',{name:/Food/}))await user.click(radio);
 await user.click(screen.getByRole('button',{name:'提交答案'}));await waitFor(()=>expect(screen.getAllByText('原文解释。')).toHaveLength(3));expect(writes).toBe(1);
});
it('keeps failed submissions and request IDs isolated by user',async()=>{const payloads:unknown[]=[];send.mockImplementation(async(r:{method:string;data:unknown;url:string})=>{if(r.method==='POST'){payloads.push(r.data);throw new Error('offline');}if(r.url.endsWith('/result'))throw new Error('not submitted');return paper;});const user=userEvent.setup();const view=render(<MemoryRouter><ReadingPracticeReader practiceId={1} basePath="/reading" userId={7}/></MemoryRouter>);await screen.findByText('Garden study');for(const radio of screen.getAllByRole('radio',{name:/Food/}))await user.click(radio);await user.click(screen.getByRole('button',{name:'提交答案'}));await screen.findByText(/提交未完成/);await user.click(screen.getByRole('button',{name:'提交答案'}));expect(payloads[0]).toEqual(payloads[1]);view.unmount();render(<MemoryRouter><ReadingPracticeReader practiceId={1} basePath="/reading" userId={8}/></MemoryRouter>);await screen.findByText('Garden study');expect(screen.getAllByRole('radio').every(r=>!(r as HTMLInputElement).checked)).toBe(true);});
