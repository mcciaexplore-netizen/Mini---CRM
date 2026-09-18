import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
const port = 3187
const base = 'http://127.0.0.1:' + port
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','-p',String(port)], {
    windowsHide: true, stdio: ['ignore','pipe','pipe'],
    env: { ...process.env, DATABASE_URL:'postgresql://unused:unused@127.0.0.1:54329/unused', BETTER_AUTH_SECRET:'smoke-only-secret-never-use-in-production-123', BETTER_AUTH_URL:base, NEXT_TELEMETRY_DISABLED:'1' }
})
let output=''
child.stdout.on('data',data=>output+=data)
child.stderr.on('data',data=>output+=data)
try {
    let ready=false
    for(let attempt=0;attempt<100;attempt++) {
        if(child.exitCode !== null) throw new Error('Server exited: '+output)
        try { if((await fetch(base+'/login')).ok) {ready=true;break} } catch {}
        await new Promise(resolve=>setTimeout(resolve,200))
    }
    assert.ok(ready,'Server did not start: '+output)
    const endpoints=[['GET','/api/me'],['GET','/api/team'],['GET','/api/leads'],['POST','/api/leads'],['GET','/api/dashboard'],['GET','/api/activities'],['GET','/api/notifications'],['GET','/api/scheduler/posts'],['POST','/api/scheduler/posts'],['GET','/api/profile/logo'],['GET','/api/profile'],['POST','/api/profile'],['GET','/api/spaces'],['POST','/api/spaces'],['POST','/api/generate'],['POST','/api/campaigns/generate'],['GET','/api/settings/ai-status'],['GET','/api/sheets'],['POST','/api/sheets'],['DELETE','/api/sheets'],['POST','/api/test-connection']]
    for(const [method,path] of endpoints) {
        const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{})})
        assert.equal(response.status,401,method+' '+path)
    }
    const forged=await fetch(base+'/api/me',{headers:{Cookie:'better-auth.session_token=forged.signature'}})
    assert.equal(forged.status,503,'An unverifiable session fails closed when the database is unavailable')
    const forgedPage=await fetch(base+'/leads',{headers:{Cookie:'better-auth.session_token=forged.signature'},redirect:'manual'})
    assert.equal(forgedPage.status,500,'Protected layout fails closed when the database is unavailable')
    const crossOrigin=await fetch(base+'/api/leads',{method:'POST',headers:{Cookie:'better-auth.session_token=forged.signature',Origin:'https://other.example.com','Content-Type':'application/json'},body:'{}'})
    assert.equal(crossOrigin.status,403)
    const bypass=await fetch(base+'/api/profile',{headers:{'x-middleware-subrequest':'middleware:middleware:middleware:middleware:middleware'}})
    assert.equal(bypass.status,401)
    const page=await fetch(base+'/leads',{redirect:'manual'})
    assert.equal(page.status,307)
    assert.match(page.headers.get('location'),/\/login$/)
    console.log('Passed: '+endpoints.length+' protected endpoints reject anonymous access; unverifiable cookies fail closed while the database is offline; a middleware bypass header and cross-origin writes are rejected; protected pages redirect to login.')
} catch(error) { console.error(output); throw error } finally { child.kill() }
