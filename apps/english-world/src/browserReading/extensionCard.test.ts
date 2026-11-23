import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import code from '../../../browser-reading-extension/content.js?raw';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.replaceChildren();delete (globalThis as any).englishWorldReadingCard;});

it('shows phonetic, whole sentence meaning, editable notes, source and user-triggered speech',async()=>{
 const roots:ShadowRoot[]=[];const original=Element.prototype.attachShadow;
 vi.spyOn(Element.prototype,'attachShadow').mockImplementation(function(this:Element,options){const root=original.call(this,options);roots.push(root);return root;});
 vi.stubGlobal('CSSStyleSheet',class{replaceSync(){}});
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
 Object.defineProperty(Range.prototype,'getBoundingClientRect',{configurable:true,value:()=>({left:20,bottom:40})});
 const speak=vi.fn<(utterance: SpeechSynthesisUtterance) => void>();const cancel=vi.fn();vi.stubGlobal('speechSynthesis',{getVoices:()=>[{lang:'en-GB',name:'English'}],speak,cancel});
 vi.stubGlobal('SpeechSynthesisUtterance',class{constructor(public text:string){} });
 const send=vi.fn(async(message)=>message.kind==='explain'?{data:{lemma:'bank',phonetic:'/bæŋk/',meaning:'河岸',sentence:'We walked along the bank.',sentenceTranslation:'我们沿着河岸行走。',explanation:'这里指河流边缘。',source:{url:'https://example.test/article#river',title:'River walk'},previewToken:'preview',wordExists:false,saved:false}}:{data:{wordId:7}});
 let listener:(message:unknown,sender:unknown,reply:()=>void)=>void;
 vi.stubGlobal('chrome',{runtime:{sendMessage:send,onMessage:{addListener:(callback:typeof listener)=>{listener=callback;}}}});
 document.body.innerHTML='<p>We walked along the bank.</p>';
 const range=document.createRange(),text=document.querySelector('p')!.firstChild!;range.setStart(text,20);range.setEnd(text,24);window.getSelection()!.removeAllRanges();window.getSelection()!.addRange(range);
 (0,eval)(code);listener!({kind:'read-selection',selected:'bank'},{},()=>{});
 await waitFor(()=>expect(roots).toHaveLength(1));const ui=within(roots[0].querySelector('section')!);
 expect(await ui.findByText('/bæŋk/')).toBeVisible();expect(ui.getByText('我们沿着河岸行走。')).toBeVisible();
 expect(ui.getByRole('link',{name:/River walk/})).toHaveAttribute('href','https://example.test/article#river');
 const note=ui.getByRole('textbox',{name:'单词笔记'});expect(note).toHaveValue('这里指河流边缘。');
 const play = ui.getByRole('button', { name: /播放.*发音/ });
 expect(speak).not.toHaveBeenCalled();
 fireEvent.click(play);
 expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'bank', lang: 'en-GB' }));
 fireEvent.click(play);
 expect(speak).toHaveBeenCalledTimes(2);
 const replacedSpeech = speak.mock.calls[0][0];
 replacedSpeech.onerror?.call(replacedSpeech, new Event('error') as SpeechSynthesisErrorEvent);
 fireEvent.input(note,{target:{value:'注意 bank 在这里是河岸。'}});fireEvent.click(ui.getByRole('button',{name:'加入词库'}));
 await waitFor(()=>expect(send).toHaveBeenCalledWith({kind:'save',payload:{previewToken:'preview',note:'注意 bank 在这里是河岸。'}}));
 fireEvent.click(ui.getByRole('button',{name:'关闭'}));expect(cancel).toHaveBeenCalledTimes(2);
});
