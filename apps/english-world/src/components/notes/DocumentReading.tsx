import { useEffect, useRef, useState, type ReactNode } from 'react';
import './vitepress/vp-doc.css';
import './documentReading.css';
type Heading={id:string;title:string;level:number};
/** A private dynamic document, using VitePress's official prose theme and existing safe Markdown. */
export function DocumentReading({children,identity}:{children:ReactNode;identity:string}){
 const root=useRef<HTMLDivElement>(null);const [headings,setHeadings]=useState<Heading[]>([]);const [active,setActive]=useState('');
 useEffect(()=>{const node=root.current;if(!node)return;const elements=[...node.querySelectorAll<HTMLElement>('.note-content :is(h1,h2,h3,h4,h5,h6),.knowledge-article>section>h2')];const list=elements.map((h,i)=>{h.id=`note-${identity.replace(/[^a-z0-9-]/gi,'-')}-heading-${i}`;return{id:h.id,title:h.textContent||'',level:Number(h.tagName.slice(1))};});setHeadings(list);const scroller=node.closest('.knowledge-reader-pane')??window;const update=()=>{const top=scroller instanceof Element?scroller.getBoundingClientRect().top:0;let current=list[0]?.id||'';for(const h of elements)if(h.getBoundingClientRect().top<=top+140)current=h.id;setActive(current);};scroller.addEventListener('scroll',update,{passive:true});update();return()=>scroller.removeEventListener('scroll',update);},[identity]);
 return <div className="document-reading" ref={root}><div className="document-prose">{children}</div><aside className="document-outline" aria-label="本页目录"><strong>本页目录</strong>{headings.length?headings.map(h=><a key={h.id} href={`#${h.id}`} aria-current={active===h.id?'location':undefined} className={h.level>2?'is-nested':undefined} onClick={e=>{e.preventDefault();document.getElementById(h.id)?.scrollIntoView?.({behavior:'smooth',block:'start'});setActive(h.id);}}>{h.title}</a>):<span>正文没有小标题</span>}</aside></div>;
}
