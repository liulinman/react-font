import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import AnnotationText from './AnnotationText';
import type {Annotation} from './types';
afterEach(cleanup);
it('looks up the clicked word within a sentence annotation while opening its note', () => {
 const text = 'Many linguists doubt this.';
 const annotation = {id:'a', start:0, end:text.length, quote:text, color:'blue', anchorStatus:'active'} as Annotation;
 const onWord=vi.fn(), onOpen=vi.fn();
 render(<AnnotationText paragraph={{id:'p',text}} annotations={[annotation]} onSelect={vi.fn()} onOpen={onOpen} onWord={onWord}/>);
 fireEvent.click(screen.getByRole('button',{name:'查看词库：linguists'}));
 expect(onWord).toHaveBeenCalledExactlyOnceWith('linguists','Many <target>linguists</target> doubt this.');
 expect(onOpen).toHaveBeenCalledWith(annotation);
 onWord.mockClear();
 fireEvent.keyDown(screen.getByRole('button',{name:'查看词库：doubt'}),{key:'Enter'});
 expect(onWord).toHaveBeenCalledExactlyOnceWith('doubt','Many linguists <target>doubt</target> this.');
});
