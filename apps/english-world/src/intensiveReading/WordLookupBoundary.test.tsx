import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import ReadingWorkbench from './ReadingWorkbench';
import { lookupCollectedWord } from './collectedWordApi';
import type { Material } from './types';
vi.mock('./collectedWordApi',()=>({lookupCollectedWord:vi.fn()}));
afterEach(cleanup);
it('opens a sentence annotation without querying the whole quote',()=>{
 Element.prototype.scrollIntoView=vi.fn();
 const quote='x'.repeat(201);
 const material={updatedAt:'2026-11-03',id:'boundary',title:'Boundary',status:'ready',version:1,sourceType:'text',originalText:quote,sources:[],activeBodyVersionId:'v1',uncertainties:[],progress:null,paragraphs:[{id:'p',text:quote}],annotations:[{id:'a',bodyVersionId:'v1',paragraphId:'p',start:0,end:201,quote,color:'yellow',category:'',note:'',isQuestion:false,resolved:false,anchorStatus:'active',version:1}]} as Material;
 render(<RouterProvider router={createMemoryRouter([{path:'/',element:<ReadingWorkbench material={material} onChange={vi.fn()}/>}])}/>);
 fireEvent.click(screen.getByRole('button',{name:`打开标注：${quote}`}));
 expect(screen.queryByRole('dialog')).toBeNull();expect(lookupCollectedWord).not.toHaveBeenCalled();
});
