import {expect,it} from 'vitest';
import {wordLookupContext} from './wordLookupContext';
it('distinguishes repeated spellings by clicked position and bounds the context',()=>{
 const text='I saw the saw.';
 expect(wordLookupContext(text,2,5)).toBe('I <target>saw</target> the saw.');
 expect(wordLookupContext(text,10,13)).toBe('I saw the <target>saw</target>.');
 const longSentence = 'Long sentence ' + 'x'.repeat(800) + ' target ends here.';
 const context=wordLookupContext(longSentence,815,821);
 expect(context.replace(/<\/?target>/g,'')).toBe(longSentence);
 expect(context.length).toBeLessThanOrEqual(1000);
});
