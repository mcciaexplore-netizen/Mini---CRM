import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {createAppAuth} from '../src/lib/authCore.mjs'

// Exercise Better Auth's actual PostgreSQL adapter against embedded PostgreSQL.
function poolFor(db){
 let tail=Promise.resolve()
 return {
  async connect(){
   const previous=tail
   let unlock
   tail=new Promise(resolve=>{unlock=resolve})
   await previous
   return {
    async query(sql,params=[]){
     const result=await db.query(sql,params)
     return {...result,rowCount:result.affectedRows??result.rows.length,command:sql.trim().split(/\s+/)[0].toUpperCase()}
    },
    release:unlock
   }
  },
  async end(){}
 }
}
test('real auth handler signs up, verifies passwords, and revokes database sessions',async()=>{
 const db=new PGlite()
 try{
  await db.exec(await readFile(new URL('../neon/migrations/001_initial.sql',import.meta.url),'utf8'))
  const auth=createAppAuth(poolFor(db),{BETTER_AUTH_SECRET:'test-only-random-secret-4dd8bd243adafa19e588',BETTER_AUTH_URL:'http://localhost:3000'})
  async function call(path,body,cookie){
   return auth.handler(new Request('http://localhost:3000/api/auth/'+path,{
    method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000','X-Forwarded-For':'192.0.2.1',...(cookie?{Cookie:cookie}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
   }))
  }
  const signup=await call('sign-up/email',{name:'Business owner',email:'owner@example.com',password:'test-password-123'})
  assert.equal(signup.status,200,await signup.clone().text())
  const user=(await signup.json()).user
  assert.equal((await db.query('SELECT full_name FROM profiles WHERE id=$1',[user.id])).rows[0].full_name,'Business owner')
  const password=(await db.query('SELECT password FROM account WHERE "userId"=$1',[user.id])).rows[0].password
  assert.notEqual(password,'test-password-123')
  const bad=await call('sign-in/email',{email:'owner@example.com',password:'wrong-password'})
  assert.equal(bad.status,401)
  const signin=await call('sign-in/email',{email:'owner@example.com',password:'test-password-123'})
  assert.equal(signin.status,200,await signin.clone().text())
  const cookie=signin.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')
  assert.match(cookie,/session_token/)
  const session=await call('get-session',undefined,cookie)
  assert.equal((await session.json()).user.id,user.id)
  const forged=await call('get-session',undefined,'better-auth.session_token=forged.signature')
  assert.equal(await forged.json(),null)
  assert.equal((await call('sign-out',{},cookie)).status,200)
  const revoked=await call('get-session',undefined,cookie)
  assert.equal(await revoked.json(),null)
  assert.ok((await db.query('SELECT count(*)::int AS n FROM "rateLimit"')).rows[0].n>0)
 }finally{await db.close()}
})
