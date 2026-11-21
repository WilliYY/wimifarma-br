import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runWorker, validateManifest, estimateReservation, parseArgs, resultExitCode } from './ai-review-worker.mjs';

const deadline = '2026-11-23T14:30:00.000Z';
const manifest = (extra = {}) => ({version:1, model:'gpt-6.2-astra', reasoningEffort:'max', deadline, budgetUsd:117, maxOutputTokens:32768, jobs:[{id:'auth',title:'Synthetic audit',kind:'code',sourceHash:'a'.repeat(64),prompt:'Review synthetic code only.'}], ...extra});
const response = (extra={}) => ({ok:true,status:200,json:async()=>({status:'completed',service_tier:'default',output:[{type:'reasoning',summary:[]},{type:'message',role:'assistant',content:[{type:'output_text',text:'Finding: synthetic example.'}]}],usage:{input_tokens:100,output_tokens:50,output_tokens_details:{reasoning_tokens:30}},...extra})});
async function fixture(t) { const runDir=await mkdtemp(path.join(tmpdir(),'ai-review-worker-')); t.after(()=>rm(runDir,{recursive:true,force:true})); return {runDir,manifest:manifest(),env:{OPENAI_API_KEY:'synthetic-key'},now:()=>Date.parse('2026-11-21T12:00:00Z')}; }
const state = async dir=>JSON.parse(await readFile(path.join(dir,'checkpoint.json'),'utf8'));

test('strict manifest and CLI reject unsupported model, effort, deadline and flags',()=>{
  for(const extra of [{model:'other'},{reasoningEffort:'ultra'},{deadline:'2026-11-23T14:30:01Z'},{budgetUsd:118},{maxOutputTokens:0},{jobs:[{id:'../escape'}]},{tools:[]}]) assert.throws(()=>validateManifest(manifest(extra)));
  assert.deepEqual(parseArgs(['--manifest','x','--run-dir','y','--dry-run','--once']),{manifestPath:'x',runDir:'y',dryRun:true,once:true});
  assert.throws(()=>parseArgs(['--unknown']));
});
test('dry-run requires no key, creates no checkpoint, sends no request',async t=>{
 const f=await fixture(t); const result=await runWorker({...f,env:{},dryRun:true,fetchImpl:()=>assert.fail('network')});
 assert.equal(result.mode,'dry-run'); assert.ok(result.plannedUsd>0); await assert.rejects(state(f.runDir),{code:'ENOENT'});
});
test('key, expired deadline, budget and oversized input fail before network',async t=>{
 const f=await fixture(t); let calls=0;const fetchImpl=async()=>{calls++;return response();};
 await assert.rejects(runWorker({...f,env:{},fetchImpl}),/KEY_MISSING/);
 await assert.rejects(runWorker({...f,now:()=>Date.parse(deadline),fetchImpl}),/DEADLINE/);
 await assert.rejects(runWorker({...f,manifest:manifest({budgetUsd:0.01}),fetchImpl}),/BUDGET/);
 assert.throws(()=>estimateReservation(manifest(),{prompt:'a'.repeat(272000)}),/INPUT_LIMIT/); assert.equal(calls,0);
});
test('completed response uses fixed endpoint, store false, actual total usage and dedupes restart',async t=>{
 const f=await fixture(t);let calls=0;
 const fetchImpl=async(url,options)=>{calls++; assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.reasoning.effort,'max');assert.equal(body.tools,undefined);assert.equal(options.redirect,'error');return response();};
 await runWorker({...f,fetchImpl}); const checkpoint=await state(f.runDir); assert.equal(checkpoint.records[0].status,'completed');assert.equal(checkpoint.records[0].usage.reasoningTokens,30);assert.equal(checkpoint.records[0].chargedUsd,0.0028);
 assert.match(await readFile(path.join(f.runDir,'auth.md'),'utf8'),/Finding: synthetic/);
 await runWorker({...f,fetchImpl});assert.equal(calls,1); assert.doesNotMatch(JSON.stringify(checkpoint),/synthetic-key|Review synthetic/);
});
test('exclusive lock blocks active worker',async t=>{
 const f=await fixture(t);await writeFile(path.join(f.runDir,'worker.lock'),'existing');await assert.rejects(runWorker({...f,fetchImpl:()=>assert.fail('network')}),/LOCKED/);
 assert.equal(await readFile(path.join(f.runDir,'worker.lock'),'utf8'),'existing');
});
test('uncertain network error retains reservation and never retries, safe error only',async t=>{
 const f=await fixture(t);let calls=0; const fetchImpl=async()=>{calls++;throw new Error('secret provider body synthetic-key');};
 await runWorker({...f,fetchImpl});const checkpoint=await state(f.runDir);assert.equal(checkpoint.records[0].status,'uncertain');assert.equal(checkpoint.records[0].chargedUsd,estimateReservation(f.manifest,f.manifest.jobs[0]).usd);
 await runWorker({...f,fetchImpl});assert.equal(calls,1);assert.doesNotMatch(JSON.stringify(checkpoint),/secret provider|synthetic-key/);
});
test('incomplete is labelled and charged; HTTP errors never expose body',async t=>{
 const f=await fixture(t);await runWorker({...f,fetchImpl:async()=>response({status:'incomplete'})});assert.equal((await state(f.runDir)).records[0].status,'incomplete');
 const g=await fixture(t);await runWorker({...g,fetchImpl:async()=>({ok:false,status:429,json:()=>assert.fail('body read')})});const checkpoint=await state(g.runDir);assert.equal(checkpoint.records[0].error,'HTTP_429');assert.ok(checkpoint.records[0].chargedUsd>1);
});
test('once processes at most one job and budget remains fixed across manifest changes',async t=>{
 const f=await fixture(t);f.manifest=manifest({jobs:[...manifest().jobs,{...manifest().jobs[0],id:'second',sourceHash:'b'.repeat(64)}]});let calls=0;const fetchImpl=async()=>{calls++;return response();};await runWorker({...f,once:true,fetchImpl});assert.equal(calls,1);
 await assert.rejects(runWorker({...f,manifest:{...f.manifest,budgetUsd:116},fetchImpl}),/CHECKPOINT_CONFIG/);
});
test('deadline aborts in-flight request and persists uncertain charge',async t=>{
 const f=await fixture(t);f.now=()=>Date.parse(deadline)-31*60*1000;
 await runWorker({...f,requestTimeoutMs:20,fetchImpl:async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}))});assert.equal((await state(f.runDir)).records[0].status,'uncertain');
});
test('crash-reserved checkpoint dedupes restart and corrupt checkpoint fails closed',async t=>{
 const f=await fixture(t);await runWorker({...f,fetchImpl:async()=>{throw new Error('synthetic');}});let checkpoint=await state(f.runDir);checkpoint.records[0].status='reserved';await writeFile(path.join(f.runDir,'checkpoint.json'),JSON.stringify(checkpoint));
 await runWorker({...f,fetchImpl:()=>assert.fail('replay')});
 checkpoint.records[0].chargedUsd=0;await writeFile(path.join(f.runDir,'checkpoint.json'),JSON.stringify(checkpoint));await assert.rejects(runWorker({...f,fetchImpl:()=>assert.fail('network')}),/CHECKPOINT_INVALID/);
});
test('invalid or over-reservation usage preserves full charge and only final text is saved',async t=>{
 const f=await fixture(t);await runWorker({...f,fetchImpl:async()=>response({usage:{input_tokens:100,output_tokens:1,output_tokens_details:{reasoning_tokens:2}}})});assert.equal((await state(f.runDir)).records[0].status,'uncertain');
 const g=await fixture(t);await runWorker({...g,fetchImpl:async()=>response({output:[{type:'reasoning',summary:[{text:'PRIVATE_REASONING'}]},{type:'message',role:'assistant',content:[{type:'output_text',text:'synthetic-key FINAL'}]}]})});const output=await readFile(path.join(g.runDir,'auth.md'),'utf8');assert.match(output,/REDACTED_SECRET.*FINAL/);assert.doesNotMatch(output,/PRIVATE_REASONING|synthetic-key/);
});
test('changed job id cannot overwrite another source and duplicate source hash is sent once',async t=>{
 const f=await fixture(t);f.manifest=manifest({jobs:[...manifest().jobs,{...manifest().jobs[0],id:'other'}]});let calls=0;const fetchImpl=async()=>{calls++;return response();};await runWorker({...f,fetchImpl});assert.equal(calls,1);
 await assert.rejects(runWorker({...f,manifest:manifest({jobs:[{...manifest().jobs[0],sourceHash:'b'.repeat(64)}]}),fetchImpl}),/JOB_ID_REUSED/);
});
test('budget includes prior usage and repo artifacts are forbidden',async t=>{
 const f=await fixture(t);f.manifest=manifest({budgetUsd:estimateReservation(manifest(),manifest().jobs[0]).usd+0.001,jobs:[...manifest().jobs,{...manifest().jobs[0],id:'next',sourceHash:'b'.repeat(64)}]});let calls=0;await assert.rejects(runWorker({...f,fetchImpl:async()=>{calls++;return response();}}),/BUDGET_EXHAUSTED/);assert.equal(calls,1);
 await assert.rejects(runWorker({...f,runDir:process.cwd(),fetchImpl:()=>assert.fail('network')}),/RUN_DIR_REPOSITORY/);
});
test('requests force Standard tier and stop on missing or different actual tier',async t=>{
 for(const tier of [undefined,'priority']) {
  const f=await fixture(t);f.manifest=manifest({jobs:[...manifest().jobs,{...manifest().jobs[0],id:'next',sourceHash:'b'.repeat(64)}]});let calls=0;
  const result=await runWorker({...f,fetchImpl:async(_url,options)=>{calls++;assert.equal(JSON.parse(options.body).service_tier,'default');return response({service_tier:tier});}});
  assert.equal(calls,1);assert.equal(result.counts.uncertain,1);assert.equal((await state(f.runDir)).records[0].error,'TIER_UNVERIFIED');
  await runWorker({...f,fetchImpl:async()=>{calls++;return response();}});assert.equal(calls,1);
 }
});
test('CLI exit status distinguishes uncertainty, partial review and complete review',()=>{
 assert.equal(resultExitCode({counts:{uncertain:1}}),1);assert.equal(resultExitCode({counts:{reserved:1}}),1);assert.equal(resultExitCode({counts:{incomplete:1}}),2);assert.equal(resultExitCode({counts:{completed:1}}),0);assert.equal(resultExitCode({mode:'dry-run'}),0);
});
test('remaining window below 30 minutes blocks new requests and timeout cannot exceed 30 minutes',async t=>{
 const f=await fixture(t);await assert.rejects(runWorker({...f,now:()=>Date.parse(deadline)-29*60*1000,fetchImpl:()=>assert.fail('network')}),/START_WINDOW_CLOSED/);
 await assert.rejects(runWorker({...f,requestTimeoutMs:31*60*1000,fetchImpl:()=>assert.fail('network')}),/TIMEOUT_INVALID/);
});
test('any uncertain result latches the full run across restart without automatic retry',async t=>{
 for(const status of [400,401,403,429,500]) {
  const f=await fixture(t);f.manifest=manifest({jobs:[...manifest().jobs,{...manifest().jobs[0],id:'next',sourceHash:'b'.repeat(64)}]});let calls=0;const fetchImpl=async()=>{calls++;return {ok:false,status};};
  await runWorker({...f,fetchImpl});assert.equal(calls,1);await runWorker({...f,fetchImpl});assert.equal(calls,1);
 }
});
