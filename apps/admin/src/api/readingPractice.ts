import type {AdminPractice,PracticeConfig} from './readingPractice.type';
export const listPractices=(page=1)=>({url:'/admin/reading-practices',method:'GET',data:{page,pageSize:20},__responseType:undefined as unknown as {list:AdminPractice[];total:number}});
export const getPractice=(id:number)=>({url:`/admin/reading-practices/${id}`,method:'GET',__responseType:undefined as unknown as AdminPractice});
export const generatePractice=(config:PracticeConfig,requestUid:string)=>({url:'/admin/reading-practices',method:'POST',data:{config,requestUid},__responseType:undefined as unknown as AdminPractice});
export const practiceAction=(id:number,action:'publish'|'withdraw'|'retry'|'delete')=>({url:`/admin/reading-practices/${id}${action==='delete'?'':'/'+action}`,method:action==='delete'?'DELETE':'POST',__responseType:undefined as unknown as AdminPractice});
export const newRequestId=()=>`reading-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
