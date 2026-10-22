import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@font/api',()=>({default:vi.fn(),getApiBaseUrl:()=>'/api'}));
import {requestId} from './api';
afterEach(()=>vi.unstubAllGlobals());
describe('intensive reading request identity',()=>{
 it('supports an HTTP origin without crypto.randomUUID',()=>{
  vi.stubGlobal('crypto',{getRandomValues:(a:Uint8Array)=>{a.fill(0xab);return a;}});
  expect(requestId()).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
 });
});
