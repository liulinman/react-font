import type {AdminPractice,PracticeConfig} from './readingPractice.type';
export const listPractices=(page=1)=>({url:'/admin/reading-practices',method:'GET',data:{page,pageSize:20},__responseType:undefined as unknown as {list:AdminPractice[];total:number}});
export const getPractice=(id:number)=>({url:`/admin/reading-practices/${id}`,method:'GET',__responseType:undefined as unknown as AdminPractice});
export const generatePractice=(config:PracticeConfig,requestUid:string)=>({url:'/admin/reading-practices',method:'POST',data:{config,requestUid},__responseType:undefined as unknown as AdminPractice});
export const practiceAction=(id:number,action:'publish'|'withdraw'|'retry')=>({url:`/admin/reading-practices/${id}/${action}`,method:'POST',...(action==='publish'?{data:{reviewed:true}}:{}),__responseType:undefined as unknown as AdminPractice});
export const newRequestId=()=>`reading-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
export type DeletionScope = 'current' | 'family';
export interface PracticeDeletionPreview {
  scope: DeletionScope;
  practiceIds: number[];
  versions: { id: number; title: string; version: number; status: AdminPractice['status'] }[];
  counts: { practices: number; assignments: number; submissions: number; notifications: number; receipts: number; events: number; runs: number; sources: number; sharedSources: number };
  confirmationToken: string;
}
export interface PracticeDeletionResult { deleted: true; practiceIds: number[]; sourceCleanup: { pending: boolean | number } }
export const previewPracticeDeletion = (id: number, scope: DeletionScope) => ({ url: `/admin/reading-practices/${id}/deletion-preview`, method: 'GET', data: { scope }, config: { suppressErrorMessage: true }, __responseType: undefined as unknown as PracticeDeletionPreview });
export const deletePractice = (id: number, scope: DeletionScope, confirmationToken: string) => ({ url: `/admin/reading-practices/${id}`, method: 'DELETE', data: { scope, confirmationToken, confirmed: true }, config: { suppressErrorMessage: true }, __responseType: undefined as unknown as PracticeDeletionResult });
