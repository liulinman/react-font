import {expect,it} from 'vitest';
import {clickedSentence,readingNoteForDisplay} from './readingSentence';
it('shows only the complete clicked sentence, retaining punctuation and quotes',()=>{
 expect(clickedSentence("Earlier sentence. In California, ‘apprentice’ programmes support <target>indigenous</target> languages. Volunteer apprentices learn basket weaving.")).toBe('In California, ‘apprentice’ programmes support indigenous languages.');
 expect(clickedSentence('I saw birds. A <target>saw</target> cuts wood. More context.')).toBe('A saw cuts wood.');
 expect(clickedSentence('Earlier sentence. Dr. Whalen studies <target>indigenous</target> languages. Later.')).toBe('Dr. Whalen studies indigenous languages.');
 expect(clickedSentence('The U.S. programme has 3.5 million <target>speakers</target>. Next.')).toBe('The U.S. programme has 3.5 million speakers.');
 expect(clickedSentence('First sentence. “This is <target>important</target>!” Another sentence.')).toBe('“This is important!”');
});
it('condenses legacy generated notes without rewriting ordinary personal notes or the original object',()=>{
 const note='原文词：indigenous → indigenous\n\n原文语境：Earlier context. Programmes support indigenous languages. Later context.\n\n本句含义：本土的\n\n用法：修饰languages。';
 expect(readingNoteForDisplay(note)).toBe('原文词：indigenous → indigenous\n\n原文语境：Programmes support indigenous languages.\n\n本句含义：本土的\n\n用法：修饰languages。');
 expect(readingNoteForDisplay('My notes. Several sentences.')).toBe('My notes. Several sentences.');
});
