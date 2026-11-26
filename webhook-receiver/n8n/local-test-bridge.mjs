// Test-only bridge. Binds to loopback; exposes no n8n editor or other route.
// Only aggregate test events can reach the authenticated local workflow.
import { createServer } from 'node:http';
const route = '/webhook/crm-florencio-whatsapp-teste';
const listenPort = 5680;
const finish = (res,status,body) => {
  res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(JSON.stringify({status:body}));
};
const server = createServer(async (req,res) => {
  if (req.url !== route || req.method !== 'POST') { finish(res,404,'not_found'); return; }
  const token = req.headers['x-florencio-webhook-token'];
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/i.test(token)) { finish(res,403,'forbidden'); return; }
  if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) { finish(res,415,'invalid_request'); return; }
  let size=0; const chunks=[];
  try {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 1024) { finish(res,413,'too_large'); return; }
      chunks.push(chunk);
    }
    const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const validCount = n => Number.isSafeInteger(n) && n >= 0 && n <= 1000;
    if (!payload || typeof payload !== 'object' || Object.keys(payload).length !== 3 ||
        payload.environment !== 'test' || !validCount(payload.messages) ||
        !validCount(payload.statuses)) { finish(res,400,'invalid_request'); return; }
    const response=await fetch('http://127.0.0.1:5679'+route,{
      method:'POST',headers:{'content-type':'application/json','x-florencio-webhook-token':token},
      body:JSON.stringify({environment:'test',messages:payload.messages,statuses:payload.statuses}),
      redirect:'error',signal:AbortSignal.timeout(5000)
    });
    if (!response.ok) { finish(res,response.status===401 || response.status===403 ? 403 : 502,'workflow_rejected'); return; }
    const result=await response.json();
    const record=Array.isArray(result) && result.length===1 ? result[0] : result;
    if (record?.status !== 'received_test_only') { finish(res,502,'unexpected_workflow_response'); return; }
    finish(res,200,'received_test_only');
  } catch { if (!res.headersSent) finish(res,502,'unavailable'); }
});
server.requestTimeout=10000;
server.headersTimeout=5000;
server.listen(listenPort,'127.0.0.1',()=>console.log('Florencio test bridge ready on loopback port '+listenPort));
