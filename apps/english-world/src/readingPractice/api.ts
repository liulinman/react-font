import type {PracticeResult,PracticeSummary,PublicPractice,Submission} from './types';
export const listPractices=(page=1)=>({url:'/reading-practices',method:'GET',data:{page,pageSize:12},__responseType:undefined as unknown as {list:PracticeSummary[];total:number}});
export const getPractice=(id:number)=>({url:`/reading-practices/${id}`,method:'GET',__responseType:undefined as unknown as PublicPractice});
export const getResult=(id:number)=>({url:`/reading-practices/${id}/result`,method:'GET',__responseType:undefined as unknown as PracticeResult});
export const submitPractice=(id:number,data:Submission)=>({url:`/reading-practices/${id}/submissions`,method:'POST',data,__responseType:undefined as unknown as PracticeResult});
export function practiceActionPath(action:unknown,mobile:boolean):string|null {const a=action as {type?:string;practiceId?:number}|null;return a?.type==='reading_practice'&&Number.isInteger(a.practiceId)&&Number(a.practiceId)>0?`${mobile?'/mobile':'/englishWorld'}/reading-practices/${a.practiceId}`:null;}
