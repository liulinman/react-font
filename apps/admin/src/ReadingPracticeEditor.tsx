import {useRef,useState} from 'react';
import {Alert,Button,Checkbox,Drawer,Form,Input,InputNumber,Radio} from 'antd';
import request from '@font/api';
import {generatePractice,newRequestId} from './api/readingPractice';
import {practiceDefaults,type PracticeConfig} from './api/readingPractice.type';
import {RecipientSelect} from './RecipientSelect';
export function PracticeFields({prefix=[]}:{prefix?:string[]}) {
 const form=Form.useFormInstance();const target=Form.useWatch([...prefix,'targetType'],form);
 return <>
  <Form.Item name={[...prefix,'topic']} label="文章主题 / 生成要求" rules={[{required:true,whitespace:true,message:'请输入主题'}]}><Input.TextArea maxLength={4000} autoSize={{minRows:3,maxRows:7}} placeholder="例如：城市花园如何改变社区生活"/></Form.Item>
  <div className="admin-form-grid">
   <Form.Item name={[...prefix,'ieltsBand']} label="雅思难度" rules={[{required:true}]}><InputNumber min={5} max={7.5} step={.5}/></Form.Item>
   <Form.Item name={[...prefix,'wordCount']} label="文章词数" rules={[{required:true,type:'integer',min:200,max:800}]}><InputNumber min={200} max={800} step={50}/></Form.Item>
   <Form.Item name={[...prefix,'questionCount']} label="题目数量" rules={[{required:true,type:'integer',min:3,max:13}]}><InputNumber min={3} max={13}/></Form.Item>
  </div>
  <Form.Item name={[...prefix,'questionTypes']} label="题型" rules={[{required:true,type:'array',min:1,message:'请至少选择一种题型'}]}><Checkbox.Group options={[{value:'choice',label:'单项选择'},{value:'true_false_not_given',label:'True / False / Not Given'}]}/></Form.Item>
  <Form.Item name={[...prefix,'targetType']} label="接收范围"><Radio.Group options={[{value:'all',label:'全部正常用户'},{value:'selected',label:'指定用户'}]}/></Form.Item>
  <Form.Item name={[...prefix,'targetUserIds']} label="接收人" hidden={target!=='selected'} rules={target==='selected'?[{required:true,type:'array',min:1,message:'请选择接收人'}]:[]}><RecipientSelect/></Form.Item>
 </>;
}
export function ReadingPracticeEditor({open,onClose,onCreated,initial}:{open:boolean;onClose:()=>void;onCreated:()=>void;initial?:PracticeConfig}) {
 const [form]=Form.useForm<PracticeConfig>();const [busy,setBusy]=useState(false);const [error,setError]=useState('');const lock=useRef(false);const attempt=useRef<{signature:string;uid:string} | undefined>(undefined);
 const create=async(config:PracticeConfig)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');const signature=JSON.stringify(config);if(attempt.current?.signature!==signature)attempt.current={signature,uid:newRequestId()};try{await request(generatePractice(config,attempt.current.uid));onCreated();onClose();}catch{setError('生成任务创建失败，参数已保留，可以重试。');}finally{setBusy(false);lock.current=false;}};
 return <Drawer title="新建阅读练习" width={640} open={open} onClose={()=>{if(!busy)onClose();}} maskClosable={!busy} closable={!busy} keyboard={!busy}>
  <Alert type="info" showIcon message="老师生成 → 审核 → 发布" description="生成后仅保存为待审核草稿。老师审核通过后手动发布，无需设置发布时间；学生提交后才能查看答案和解析。"/>
  {error&&<Alert type="error" message={error}/>}
  <Form form={form} layout="vertical" initialValues={initial??practiceDefaults} onFinish={v=>void create(v)} disabled={busy} style={{marginTop:24}}>
   <PracticeFields/><Button type="primary" htmlType="submit" loading={busy}>生成草稿</Button>
  </Form>
 </Drawer>;
}
