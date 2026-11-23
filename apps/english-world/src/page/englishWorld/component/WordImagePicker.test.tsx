import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { WordImagePicker } from './WordImagePicker';
const {upload}=vi.hoisted(()=>({upload:vi.fn()}));
vi.mock('@font/api',()=>({default:upload}));
vi.mock('@/server',()=>({uploadFile:(data:FormData)=>({url:'/upload',data})}));
beforeEach(()=>{vi.stubGlobal('URL',class extends URL{static createObjectURL=vi.fn(()=> 'blob:preview');static revokeObjectURL=vi.fn();});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.clearAllMocks();});
describe('WordImagePicker',()=>{
 it('rejects unsupported files without changing the original image',async()=>{const change=vi.fn();const {container}=render(<WordImagePicker value="https://example.test/original.png" onChange={change}/>);fireEvent.change(container.querySelector('input[type=file]')!,{target:{files:[new File(['x'],'bad.svg',{type:'image/svg+xml'})]}});expect(await screen.findByRole('alert')).toHaveTextContent('5 MB');expect(change).not.toHaveBeenCalled();expect(upload).not.toHaveBeenCalled();});
 it('keeps the original image after an upload failure and clears the busy flag',async()=>{upload.mockRejectedValueOnce(new Error('network'));const change=vi.fn(),busy=vi.fn();const {container}=render(<WordImagePicker value="https://example.test/original.png" onChange={change} onBusy={busy}/>);fireEvent.change(container.querySelector('input[type=file]')!,{target:{files:[new File(['png'],'test.png',{type:'image/png'})]}});expect(await screen.findByRole('alert')).toHaveTextContent('上传失败');expect(change).not.toHaveBeenCalled();expect(screen.getByAltText('词条图片预览')).toHaveAttribute('src','https://example.test/original.png');await waitFor(()=>expect(busy).toHaveBeenLastCalledWith(false));});
 it('returns the real uploaded URL and supports explicit removal',async()=>{upload.mockResolvedValueOnce('/upload/image.png');const change=vi.fn();const {container}=render(<WordImagePicker value="/upload/old.png" onChange={change}/>);fireEvent.change(container.querySelector('input[type=file]')!,{target:{files:[new File(['png'],'test.png',{type:'image/png'})]}});await waitFor(()=>expect(change).toHaveBeenCalledWith('/upload/image.png'));fireEvent.click(screen.getByRole('button',{name:'移除图片'}));expect(change).toHaveBeenLastCalledWith('');});
});
