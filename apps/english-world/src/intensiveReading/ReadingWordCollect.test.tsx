import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {playBritishPronunciation} from '@/page/englishWorld/utils/pronunciation';
import CollectedWordCard from './CollectedWordCard';
import {lookupCollectedWord,explainReadingWord,collectReadingWord} from './collectedWordApi';
vi.mock('./collectedWordApi',()=>({lookupCollectedWord:vi.fn(),explainReadingWord:vi.fn(),collectReadingWord:vi.fn()}));
vi.mock('@/page/englishWorld/utils/pronunciation',()=>({playBritishPronunciation:vi.fn().mockResolvedValue(undefined)}));
vi.mock('@/components/notes/NoteContent',()=>({NoteContent:({text}:{text:string})=><p>{text}</p>}));
const missing={sourceWord:'sprawls',lemma:'sprawl',resolution:'ai' as const,word:null};
const draft={sourceWord:'sprawls',lemma:'sprawl',meaning:'蔓延',phonetic:'/sprɔːl/',dictionaryMeaning:'伸展；蔓延',explanation:'表示城镇向周围延伸。',context:'The town sprawls across the valley.',partSpeech:1,previewToken:'token'};
const mount=()=>render(<CollectedWordCard word="sprawls" context="The town <target>sprawls</target> across the valley." onClose={vi.fn()}/>);
afterEach(()=>{cleanup();vi.resetAllMocks();});
it('queries the current-sentence meaning and only collects after explicit confirmation',async()=>{
 vi.mocked(lookupCollectedWord).mockResolvedValue(missing);vi.mocked(explainReadingWord).mockResolvedValue({...missing,draft});vi.mocked(collectReadingWord).mockResolvedValue({created:true,word:{id:42,englishWord:'sprawl',englishChinese:'蔓延',englishNote:'Saved context'}});
 mount();
 expect(await screen.findByText('表示城镇向周围延伸。')).toBeTruthy();expect(screen.getByText('伸展；蔓延')).toBeTruthy();expect(screen.getByText(/sprɔːl/)).toBeTruthy();expect(screen.getByRole('button',{name:'播放 sprawl 的发音'})).toBeTruthy();expect(collectReadingWord).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'播放 sprawl 的发音'}));
 await waitFor(()=>expect(playBritishPronunciation).toHaveBeenCalledWith('sprawl',undefined,expect.objectContaining({onError:expect.any(Function)})));
 fireEvent.click(screen.getByRole('button',{name:'添加到词库'}));expect(await screen.findByText('Saved context')).toBeTruthy();
 expect(collectReadingWord).toHaveBeenCalledWith('token');expect(screen.getByRole('button',{name:'播放 sprawl 的发音'})).toBeTruthy();
});
it('keeps the draft after an add failure and supports retry',async()=>{
 vi.mocked(lookupCollectedWord).mockResolvedValue(missing);vi.mocked(explainReadingWord).mockResolvedValue({...missing,draft});vi.mocked(collectReadingWord).mockRejectedValueOnce(new Error('保存失败')).mockResolvedValueOnce({created:true,word:{id:42,englishWord:'sprawl',englishChinese:'蔓延'}});
 mount();fireEvent.click(await screen.findByRole('button',{name:'添加到词库'}));
 expect(await screen.findByText('保存失败')).toBeTruthy();expect(screen.getByText('表示城镇向周围延伸。')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'重试添加'}));await screen.findByRole('button',{name:'播放 sprawl 的发音'});
});
it('ignores an old meaning when switching to a different word',async()=>{
 let finish!:(v:any)=>void;vi.mocked(lookupCollectedWord).mockResolvedValueOnce(missing).mockResolvedValueOnce({sourceWord:'new',lemma:'new',resolution:'ai',word:null});vi.mocked(explainReadingWord).mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const {rerender}=mount();rerender(<CollectedWordCard word="new" context="A <target>new</target> place" onClose={vi.fn()}/>);
 await screen.findByRole('heading',{name:'new'});finish({...missing,draft});await waitFor(()=>expect(screen.queryByText('表示城镇向周围延伸。')).toBeNull());expect(collectReadingWord).not.toHaveBeenCalled();
});
