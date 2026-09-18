import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { queryWithIdentity } from '../src/lib/databaseIdentity.mjs'
import { PGlite } from '@electric-sql/pglite'
const migration = await readFile(new URL('../neon/migrations/001_initial.sql',import.meta.url),'utf8')
const ids = { owner:'10000000-0000-0000-0000-000000000001', other:'20000000-0000-0000-0000-000000000002', member:'30000000-0000-0000-0000-000000000003', viewer:'40000000-0000-0000-0000-000000000004' }
async function database() { const db=new PGlite(); await db.exec('CREATE ROLE anonymous NOLOGIN'); return db }
async function addUser(db,id) { await db.query('INSERT INTO "user"(id,name,email,"createdAt","updatedAt") VALUES($1,$2,$3,now(),now())',[id,'Test user',id+'@example.com']) }
async function asUser(db,id,sql,params=[]) {
 const rows=await queryWithIdentity({connect:async()=>({query:(text,values)=>db.query(text,values),release(){}})},id,sql,params)
 return {rows}
}
test('database enforces isolation, permissions and persistent lead workflows', async t => {
    const db=await database()
    try {
        await db.exec(migration)
        for(const id of Object.values(ids)) await addUser(db,id)
        const orgA=(await asUser(db,ids.owner,"SELECT create_business('Business A') AS id")).rows[0].id
        const orgB=(await asUser(db,ids.other,"SELECT create_business('Business B') AS id")).rows[0].id
        await db.query("INSERT INTO organization_members VALUES($1,$2,'member'),($1,$3,'viewer')",[orgA,ids.member,ids.viewer])
        const spaceA=(await asUser(db,ids.owner,'SELECT id FROM spaces')).rows[0].id
        const spaceB=(await asUser(db,ids.other,'SELECT id FROM spaces')).rows[0].id
        let lead
        await t.test('onboarding creates isolated business, profile and default pipeline',async()=>{
            assert.notEqual(orgA,orgB)
            assert.equal((await asUser(db,ids.owner,'SELECT * FROM business_profile')).rows.length,1)
            assert.equal((await asUser(db,ids.other,'SELECT * FROM spaces')).rows.length,1)
            await assert.rejects(asUser(db,ids.owner,"SELECT create_business('Duplicate')"),/already belong/)
        })
        await t.test('ordinary lead creation, editing and automatic activity work',async()=>{
            lead=(await asUser(db,ids.member,'INSERT INTO leads(space_id,name,deal_value,assignee_id) VALUES($1,$2,2500,$3) RETURNING *',[spaceA,'Customer',ids.member])).rows[0]
            assert.equal(lead.organization_id,orgA)
            assert.equal(lead.created_by,ids.member)
            await asUser(db,ids.member,"UPDATE leads SET status='WON', next_followup='2026-10-01' WHERE id=$1",[lead.id])
            const rows=(await asUser(db,ids.owner,'SELECT description FROM activities WHERE lead_id=$1 ORDER BY logged_at',[lead.id])).rows
            assert.equal(rows.length,2)
            assert.match(rows[1].description,/NEW to WON/)
            await asUser(db,ids.member,"INSERT INTO activities(lead_id,type,description) VALUES($1,'Note','Follow up after delivery')",[lead.id])
            assert.equal((await asUser(db,ids.member,'SELECT * FROM activities WHERE lead_id=$1',[lead.id])).rows.length,3)
        })
        await t.test('anonymous and another business cannot read or modify leads',async()=>{
            await assert.rejects(asUser(db,null,'SELECT * FROM leads'))
            assert.equal((await asUser(db,ids.other,'SELECT * FROM leads')).rows.length,0)
            assert.equal((await asUser(db,ids.other,"UPDATE leads SET name='stolen' WHERE id=$1 RETURNING id",[lead.id])).rows.length,0)
            await assert.rejects(asUser(db,null,'INSERT INTO leads(space_id,name) VALUES($1,$2)',[spaceA,'Anonymous']))
        })
        await t.test('forged tenant and cross-business references are rejected',async()=>{
            await assert.rejects(asUser(db,ids.member,'INSERT INTO leads(organization_id,space_id,name) VALUES($1,$2,$3)',[orgB,spaceB,'Forged']))
            await assert.rejects(asUser(db,ids.member,'INSERT INTO leads(space_id,name) VALUES($1,$2)',[spaceB,'Foreign space']))
            await assert.rejects(asUser(db,ids.member,'UPDATE leads SET assignee_id=$1 WHERE id=$2',[ids.other,lead.id]))
            await assert.rejects(asUser(db,ids.member,'UPDATE leads SET organization_id=$1 WHERE id=$2',[orgB,lead.id]))
        })
        await t.test('viewer cannot write; member cannot delete or promote themselves',async()=>{
            await assert.rejects(asUser(db,ids.viewer,"INSERT INTO leads(space_id,name) VALUES($1,'Viewer write')",[spaceA]))
            assert.equal((await asUser(db,ids.member,'DELETE FROM leads WHERE id=$1 RETURNING id',[lead.id])).rows.length,0)
            await assert.rejects(asUser(db,ids.member,"UPDATE organization_members SET role='owner' WHERE user_id=$1",[ids.member]))
            await assert.rejects(asUser(db,ids.member,"UPDATE profiles SET role='owner' WHERE id=$1",[ids.member]))
            await assert.rejects(asUser(db,ids.member,"UPDATE profiles SET is_active=true WHERE id=$1",[ids.member]))
            await assert.rejects(asUser(db,ids.member,'TRUNCATE leads CASCADE'))
        })
        await t.test('keys are unavailable to clients and Google tokens are private per user',async()=>{
            await db.query("INSERT INTO organization_secrets(organization_id,gemini_api_key) VALUES($1,'test-secret')",[orgA])
            await assert.rejects(asUser(db,ids.owner,'SELECT * FROM organization_secrets'))
            await assert.rejects(asUser(db,null,'SELECT * FROM organization_secrets'))
            await asUser(db,ids.owner,"INSERT INTO google_tokens(user_id,access_token) VALUES($1,'token')",[ids.owner])
            assert.equal((await asUser(db,ids.member,'SELECT * FROM google_tokens')).rows.length,0)
            assert.equal((await asUser(db,ids.other,'SELECT * FROM google_tokens')).rows.length,0)
            assert.equal((await asUser(db,ids.owner,'SELECT * FROM google_tokens')).rows.length,1)
        })
        await t.test('lead codes do not collide after deletion or batch inserts',async()=>{
            const first=(await asUser(db,ids.owner,"INSERT INTO leads(space_id,name) VALUES($1,'Temporary') RETURNING id,lead_code",[spaceA])).rows[0]
            await asUser(db,ids.owner,'DELETE FROM leads WHERE id=$1',[first.id])
            const second=(await asUser(db,ids.owner,"INSERT INTO leads(space_id,name) VALUES($1,'New') RETURNING lead_code",[spaceA])).rows[0]
            assert.notEqual(first.lead_code,second.lead_code)
            const inserted=await asUser(db,ids.owner,"INSERT INTO leads(space_id,name) SELECT $1,'Batch '||n FROM generate_series(1,20)n RETURNING lead_code",[spaceA])
            assert.equal(new Set(inserted.rows.map(r=>r.lead_code)).size,20)
        })
        await t.test('calendar event bindings reject browser poisoning while server writes work',async()=>{
            const post=(await asUser(db,ids.owner,"INSERT INTO scheduled_posts(caption,status,created_by) VALUES('Announcement','Scheduled',$1) RETURNING id",[ids.owner])).rows[0]
            await assert.rejects(asUser(db,ids.member,"UPDATE scheduled_posts SET google_event_id='foreign-event' WHERE id=$1",[post.id]))
            await assert.rejects(asUser(db,ids.owner,"UPDATE scheduled_posts SET google_event_id='foreign-event' WHERE id=$1",[post.id]))
            await assert.rejects(asUser(db,ids.owner,"INSERT INTO scheduled_posts(caption,google_event_id) VALUES('Fake','foreign-event')"))
            await asUser(db,ids.member,"UPDATE scheduled_posts SET caption='Reviewed caption' WHERE id=$1",[post.id])
            
            await db.query("UPDATE scheduled_posts SET google_event_id='server-created-event' WHERE organization_id=$1 AND id=$2",[orgA,post.id])
            await db.exec('RESET ROLE')
            assert.equal((await asUser(db,ids.owner,'SELECT google_event_id FROM scheduled_posts WHERE id=$1',[post.id])).rows[0].google_event_id,'server-created-event')
            assert.equal((await asUser(db,ids.other,'SELECT * FROM scheduled_posts WHERE id=$1',[post.id])).rows.length,0)
            // The manager can delete the local team post once the protected route removes its event.
            assert.equal((await asUser(db,ids.owner,'DELETE FROM scheduled_posts WHERE id=$1 RETURNING id',[post.id])).rows.length,1)
        })
        await t.test('pooled transactions clear identity and private auth data stays inaccessible',async()=>{
            assert.equal((await db.query('SELECT current_app_user_id() AS id')).rows[0].id,null)
            assert.notEqual((await db.query('SELECT current_user AS role')).rows[0].role,'promarketer_app')
            for(const table of ['user','session','account','verification','rateLimit','business_logos']){
                await assert.rejects(asUser(db,ids.owner,'SELECT * FROM "'+table+'"'))
            }
            assert.equal((await db.query('SELECT current_app_user_id() AS id')).rows[0].id,null)
        })
        await t.test('inactive users lose access',async()=>{
            await db.query('UPDATE profiles SET is_active=false WHERE id=$1',[ids.member])
            assert.equal((await asUser(db,ids.member,'SELECT * FROM leads')).rows.length,0)
            assert.equal((await asUser(db,ids.member,'SELECT * FROM organization_members')).rows.length,0)
        })
    } finally { await db.close() }
})
