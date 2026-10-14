import {useLocation,useParams} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';
import {ReadingPracticeList} from './ReadingPracticeList';
import {ReadingPracticeReader} from './ReadingPracticeReader';
import {ReadingPracticeResult} from './ReadingPracticeResult';
import './readingPractice.css';
export default function ReadingPracticePage(){const {user}=useAuth();const {id}=useParams();const location=useLocation();const basePath=location.pathname.startsWith('/mobile')?'/mobile/reading-practices':'/englishWorld/reading-practices';if(!user)return null;if(!id)return <ReadingPracticeList key={user.id} basePath={basePath}/>;if(!/^\d+$/.test(id)||Number(id)<1)return <p role="alert">练习编号无效</p>;return location.pathname.endsWith('/result')?<ReadingPracticeResult key={`${user.id}:${id}`} practiceId={Number(id)} basePath={basePath}/>:<ReadingPracticeReader key={`${user.id}:${id}`} practiceId={Number(id)} userId={user.id} basePath={basePath}/>;}
