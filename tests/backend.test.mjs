import test from 'node:test'
import assert from 'node:assert/strict'
import {insertStatement,updateStatement} from '../src/lib/sqlStatements.mjs'
import {checkRequestOrigin} from '../src/lib/requestOrigin.mjs'
import {readLimitedBody} from '../src/lib/limitedBody.mjs'
import {detectLogoType} from '../src/lib/logoValidation.mjs'

test('SQL binds values and rejects unapproved identifiers and event bindings',()=>{
 const attack="name'); DROP TABLE leads; --"
 const insert=insertStatement('leads',{name:attack,space_id:'space'})
 assert.ok(!insert.text.includes(attack))
 assert.equal(insert.values[0],attack)
 assert.throws(()=>insertStatement('leads; DROP TABLE profiles',{}))
 assert.throws(()=>insertStatement('scheduled_posts',{google_event_id:'foreign'}))
 const update=updateStatement('leads',{name:attack},'record','business')
 assert.match(update.text,/WHERE id=\$2 AND organization_id=\$3/)
 assert.deepEqual(update.values,[attack,'record','business'])
})

test('route-level origin protection rejects requests from another website',()=>{
 assert.doesNotThrow(()=>checkRequestOrigin(new Headers({origin:'https://crm.example.com'}),'https://crm.example.com'))
 assert.throws(()=>checkRequestOrigin(new Headers({origin:'https://other.example.com'}),'https://crm.example.com'),{status:403})
 assert.throws(()=>checkRequestOrigin(new Headers({origin:'null'}),'https://crm.example.com'),{status:403})
})

test('logo uploads reject scripts and oversized bodies, including chunked requests',async()=>{
 assert.throws(()=>detectLogoType(Buffer.from('<svg onload="alert(1)"/>')),{status:400})
 assert.throws(()=>detectLogoType(Buffer.alloc(524289)),{status:400})
 assert.equal(detectLogoType(Buffer.from([137,80,78,71,13,10,26,10])),'image/png')
 const request=new Request('https://crm.example.com/upload',{method:'POST',body:new ReadableStream({start(controller){controller.enqueue(new Uint8Array(8));controller.enqueue(new Uint8Array(8));controller.close()}}),duplex:'half'})
 await assert.rejects(readLimitedBody(request,10),{status:413})
 const small=new Request('https://crm.example.com/upload',{method:'POST',body:'small'})
 assert.equal((await readLimitedBody(small,10)).toString(),'small')
})
