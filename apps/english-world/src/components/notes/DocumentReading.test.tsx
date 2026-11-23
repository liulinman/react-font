import '@testing-library/jest-dom/vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import {afterEach,describe,expect,it} from 'vitest';
import {DocumentReading} from './DocumentReading';
import {NoteContent} from './NoteContent';
afterEach(cleanup);
describe('DocumentReading',()=>{
 it('uses only actual content headings, including repeated deep headings',async()=>{render(<DocumentReading identity="test"><article className="knowledge-article"><h1>固定标题</h1><NoteContent className="vp-doc" text={'## 正文标题\n##### 深层标题\n###### 深层标题'}/></article></DocumentReading>);const outline=screen.getByRole('complementary',{name:'本页目录'});await waitFor(()=>expect(outline.querySelectorAll('a')).toHaveLength(3));expect(outline).not.toHaveTextContent('固定标题');const hrefs=[...outline.querySelectorAll('a')].map(x=>x.getAttribute('href'));expect(new Set(hrefs).size).toBe(3);});
 it('shows an honest empty outline for a plain note without modifying its source',async()=>{const text='普通笔记\n仍然保留换行';render(<DocumentReading identity="plain"><article className="knowledge-article"><h1>固定标题</h1><NoteContent text={text}/></article></DocumentReading>);await screen.findByText('正文没有小标题');expect(screen.getByText(/普通笔记/)).toHaveTextContent('普通笔记');expect(screen.getByRole('complementary',{name:'本页目录'}).querySelector('a')).toBeNull();});
});
