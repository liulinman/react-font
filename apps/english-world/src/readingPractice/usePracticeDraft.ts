import {useState} from 'react';
import type {Question} from './types';
interface Draft {schemaVersion:1;requestUid:string;answers:Record<string,number>;savedAt:number}
export function usePracticeDraft(userId:number,practiceId:number,questions:Question[]) {
 const key=`reading-practice:v1:${userId}:${practiceId}`;
 const [notice,setNotice]=useState('');
 const [draft,setDraft]=useState<Draft>(()=>{
  const fresh:Draft={schemaVersion:1,requestUid:`submit-${Date.now()}-${Math.random().toString(36).slice(2)}`,answers:{},savedAt:Date.now()};
  try {const text=localStorage.getItem(key);if(!text)return fresh;const stored=JSON.parse(text) as Draft;
   if(stored.schemaVersion!==1||typeof stored.requestUid!=='string'||!/^[-\w:.]{8,128}$/.test(stored.requestUid)||!stored.answers||typeof stored.answers!=='object'||Array.isArray(stored.answers)||typeof stored.savedAt!=='number'||Object.entries(stored.answers).some(([id,n])=>!questions.some(q=>q.id===id&&Number.isInteger(n)&&n>=0&&n<q.options.length)))throw new Error('invalid draft');return stored;
  }catch{try{localStorage.removeItem(key);}catch{/* storage unavailable */}setNotice('本机草稿无法恢复，请重新选择答案。');return fresh;}
 });
 const choose=(id:string,index:number)=>{const next={...draft,answers:{...draft.answers,[id]:index},savedAt:Date.now()};setDraft(next);try{localStorage.setItem(key,JSON.stringify(next));}catch{setNotice('本机无法保存草稿，请保持页面打开直至提交。');}};
 const clear=()=>{try{localStorage.removeItem(key);}catch{/* optional browser storage */}};
 return {draft,choose,clear,notice};
}
