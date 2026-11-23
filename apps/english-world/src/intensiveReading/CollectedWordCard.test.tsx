import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CollectedWordCard from './CollectedWordCard';
import { playBritishPronunciation } from '@/page/englishWorld/utils/pronunciation';
import { lookupCollectedWord } from './collectedWordApi';
vi.mock('@/page/englishWorld/utils/pronunciation',()=>({playBritishPronunciation:vi.fn()}));
vi.mock('./collectedWordApi', () => ({ lookupCollectedWord: vi.fn() }));
vi.mock('@/components/notes/NoteContent', () => ({ NoteContent: ({text}:{text:string}) => <p>{text}</p> }));
const answer=(sourceWord:string,value:any)=>({sourceWord,lemma:value?.englishWord||sourceWord,resolution:'ai' as const,word:value});
afterEach(()=>{cleanup();vi.resetAllMocks();});
describe('collected word card',()=>{
 it('shows saved content and a distinct missing state',async()=>{
  vi.mocked(lookupCollectedWord).mockResolvedValueOnce(answer('Urban',{id:1,englishWord:'Urban',englishChinese:'城市的',englishNote:'My own note'})).mockResolvedValueOnce(answer('unknown',null));
  const {rerender}=render(<CollectedWordCard word="Urban" onClose={vi.fn()}/>);
  expect(await screen.findByText('My own note')).toBeTruthy();
  rerender(<CollectedWordCard word="unknown" onClose={vi.fn()}/>);
  expect(await screen.findByText('还没有收集这个词')).toBeTruthy();
  expect(screen.queryByText('My own note')).toBeNull();
 });
 it('ignores an old response after switching words',async()=>{
  let finish!:(value:any)=>void;
  vi.mocked(lookupCollectedWord).mockImplementationOnce(()=>new Promise(r=>{finish=r;})).mockResolvedValueOnce(answer('new',{id:2,englishWord:'new',englishChinese:'新的'}));
  const {rerender}=render(<CollectedWordCard word="old" onClose={vi.fn()}/>);
  rerender(<CollectedWordCard word="new" onClose={vi.fn()}/>);
  expect(await screen.findByText('新的')).toBeTruthy();
  finish(answer('old',{id:1,englishWord:'old',englishChinese:'旧的'}));
  await waitFor(()=>expect(screen.queryByText('旧的')).toBeNull());
 });
 it('retries errors and supports keyboard movement and close',async()=>{
  vi.mocked(lookupCollectedWord).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(answer('Urban',null));
  const close=vi.fn();render(<CollectedWordCard word="Urban" onClose={close}/>);
  fireEvent.click(await screen.findByRole('button',{name:'重试查询'}));
  expect(await screen.findByText('还没有收集这个词')).toBeTruthy();
  const card=screen.getByRole('dialog');const before=card.style.left;
  fireEvent.keyDown(screen.getByRole('button',{name:/移动词卡/}),{key:'ArrowLeft'});
  expect(card.style.left).not.toBe(before);
  fireEvent.keyDown(card,{key:'Escape'});expect(close).toHaveBeenCalledOnce();
 });
 it('shows AI source-to-lemma mapping and keeps uncertainty distinct from missing',async()=>{
  vi.mocked(lookupCollectedWord).mockResolvedValueOnce(answer('sprawls',{id:1,englishWord:'sprawl',englishChinese:'蔓延'})).mockResolvedValueOnce({sourceWord:'saw',lemma:null,resolution:'uncertain',word:null});
  const {rerender}=render(<CollectedWordCard word="sprawls" context="The park sprawls across four districts." onClose={vi.fn()}/>);
  expect(await screen.findByText('原文词：sprawls → 原型：sprawl')).toBeTruthy();
  expect(lookupCollectedWord).toHaveBeenCalledWith('sprawls','The park sprawls across four districts.');
  rerender(<CollectedWordCard word="saw" context="unclear" onClose={vi.fn()}/>);
  expect(await screen.findByText('暂时无法确定单词原型')).toBeTruthy();expect(screen.queryByText('还没有收集这个词')).toBeNull();
 });

 it('ignores a late answer for the same spelling in a different context',async()=>{
  let finish!:(value:any)=>void;
  vi.mocked(lookupCollectedWord).mockImplementationOnce(()=>new Promise(r=>{finish=r;})).mockResolvedValueOnce(answer('saw',{id:2,englishWord:'saw',englishChinese:'锯子'}));
  const {rerender}=render(<CollectedWordCard word="saw" context="I saw birds" onClose={vi.fn()}/>);
  rerender(<CollectedWordCard word="saw" context="A saw cuts wood" onClose={vi.fn()}/>);
  expect(await screen.findByText('锯子')).toBeTruthy();finish(answer('saw',{id:1,englishWord:'see',englishChinese:'看见'}));
  await waitFor(()=>expect(screen.queryByText('看见')).toBeNull());
 });

 it('plays the collected lemma with its owned word ID and supports explicit retry',async()=>{
  vi.mocked(lookupCollectedWord).mockResolvedValueOnce(answer('sprawls',{id:42,englishWord:'sprawl',englishPhonetic:'/sprɔːl/',englishChinese:'蔓延'}));
  vi.mocked(playBritishPronunciation).mockRejectedValueOnce(new Error('audio unavailable')).mockResolvedValueOnce(undefined);
  render(<CollectedWordCard word="sprawls" onClose={vi.fn()}/>);
  fireEvent.click(await screen.findByRole('button',{name:'播放 sprawl 的发音'}));
  const retry=await screen.findByRole('button',{name:'重试发音'});
  expect(playBritishPronunciation).toHaveBeenNthCalledWith(1,'sprawl',42,expect.objectContaining({onError:expect.any(Function)}));
  fireEvent.click(retry);await waitFor(()=>expect(playBritishPronunciation).toHaveBeenCalledTimes(2));
  expect(playBritishPronunciation).toHaveBeenLastCalledWith('sprawl',42,expect.objectContaining({retryUid:expect.any(String)}));
 });

});
it('preserves actionable service errors instead of masking them as a generic lookup failure',async()=>{
 vi.mocked(lookupCollectedWord).mockRejectedValueOnce({message:'AI服务繁忙，请稍后重试'});
 render(<CollectedWordCard word="sprawls" onClose={vi.fn()}/>);
 expect(await screen.findByText('AI服务繁忙，请稍后重试')).toBeTruthy();
 expect(screen.getByRole('button',{name:'重试查询'})).toBeTruthy();
});
it('renders only the original sentence in a legacy generated context block',async()=>{
 const note='原文词：indigenous → indigenous\n\n原文语境：Earlier context. Programmes support indigenous languages. Later context.\n\n本句含义：本土的\n\n用法：修饰languages。';
 vi.mocked(lookupCollectedWord).mockResolvedValueOnce(answer('indigenous',{id:99,englishWord:'indigenous',englishChinese:'本土的',englishNote:note}));
 render(<CollectedWordCard word="indigenous" context="Programmes support <target>indigenous</target> languages." onClose={vi.fn()}/>);
 await screen.findByText(/原文语境：Programmes support indigenous languages/);
 expect(screen.queryByText(/Earlier context/)).toBeNull();expect(screen.queryByText(/Later context/)).toBeNull();
 expect(note).toContain('Earlier context.');
});
