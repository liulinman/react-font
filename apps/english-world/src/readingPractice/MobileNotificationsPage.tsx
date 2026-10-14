import {useNotifications} from '@/notifications/NotificationContext';
import {Link} from 'react-router-dom';
import {practiceActionPath} from './api';
import './readingPractice.css';
export function MobileNotificationsPage(){const {items,loading,markRead,markAllRead}=useNotifications();return <main className="reading-practice"><h1>通知</h1><button onClick={()=>void markAllRead()}>全部已读</button>{loading&&<p>正在加载…</p>}{items.map(item=><article className="rp-card" style={{marginTop:16}} key={item.id}><h2>{item.title}</h2><p>{item.body}</p>{practiceActionPath(item.action,true)?<Link to={practiceActionPath(item.action,true)!} onClick={()=>void markRead(item.id)}>开始练习 →</Link>:!item.readAt&&<button onClick={()=>void markRead(item.id)}>标记已读</button>}</article>)}</main>;}
