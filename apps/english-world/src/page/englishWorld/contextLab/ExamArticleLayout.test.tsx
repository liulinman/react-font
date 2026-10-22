import '@testing-library/jest-dom/vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {newExamDraft,restoreExamDraft} from './ieltsExamState';
import {ExamAnnotationText} from './ExamAnnotationText';
import {readingExamTask} from '@/readingPractice/SharedReadingExam';
import type {PublicPractice} from '@/readingPractice/types';
afterEach(cleanup);
const paper={id:5,title:'Trees',paragraphs:['First 😀 sentence.','Second paragraph.'],questions:[]} as unknown as PublicPractice;
describe('Normal article presentation',()=>{
 it('hides synthetic headings while keeping source text and old anchor positions unchanged',()=>{
  const task=readingExamTask(paper),source='Trees\n\nParagraph 1\n\nFirst 😀 sentence.\n\nParagraph 2\n\nSecond paragraph.';
  expect(task.article).toBe(source);
  const start=source.indexOf('Second');
  const old=newExamDraft({...task,articleOmissions:undefined});old.answers={};old.annotations=[{id:'old',block:'article',kind:'highlight',start,end:start+6,text:'Second',note:'existing note'}];
  expect(newExamDraft(task).content).toBe(old.content);
  expect(restoreExamDraft(JSON.stringify(old),task).annotations[0].note).toBe('existing note');
  render(<ExamAnnotationText block="article" text={source} omissions={task.articleOmissions} annotations={[{id:'old',block:'article',kind:'highlight',start,end:start+6,text:'Second',note:''}]} onSelect={vi.fn()} onOpen={vi.fn()}/>);
  expect(screen.getByTestId('exam-text-article')).toHaveTextContent('First 😀 sentence. Second paragraph.');
  expect(screen.getByTestId('exam-text-article').textContent).not.toMatch(/Trees|Paragraph/);
  expect(screen.getByRole('button',{name:'查看高亮：Second'})).toHaveTextContent('Second');
 });
 it('maps a new selection back to its original source offset after omitted labels',()=>{
  const task=readingExamTask(paper),onSelect=vi.fn();
  render(<ExamAnnotationText block="article" text={task.article!} omissions={task.articleOmissions} annotations={[]} onSelect={onSelect} onOpen={vi.fn()}/>);
  const root=screen.getByTestId('exam-text-article');const node=Array.from(root.childNodes).find(n=>n.textContent?.includes('Second'))!;
  const offset=node.textContent!.indexOf('Second'),range=document.createRange();range.setStart(node,offset);range.setEnd(node,offset+6);window.getSelection()!.removeAllRanges();window.getSelection()!.addRange(range);fireEvent.contextMenu(root);
  expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({start:task.article!.indexOf('Second'),end:task.article!.indexOf('Second')+6,text:'Second'}),expect.anything());
 });
});
