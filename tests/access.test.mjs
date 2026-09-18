import test from 'node:test'
import assert from 'node:assert/strict'
import { authorizeMembership, requireSheetsAccess, pickFields } from '../src/lib/access.mjs'
import { createOAuthState, validOAuthState } from '../src/lib/oauthState.mjs'
import { leadPayload } from '../src/lib/leadFields.mjs'
test('membership requires a signed-in, active user with the required role', () => {
 assert.throws(()=>authorizeMembership(null,null),{status:401})
 assert.throws(()=>authorizeMembership({id:'a'},null),{status:403})
 assert.throws(()=>authorizeMembership({id:'a'},{organization_id:'org',role:'owner',is_active:false}),{status:403})
 assert.throws(()=>authorizeMembership({id:'a'},{organization_id:'org',role:'member'},['owner']),{status:403})
 assert.equal(authorizeMembership({id:'a'},{organization_id:'org',role:'owner'},['owner']).organizationId,'org')
})

test('shared Sheets credentials are available only to configured business managers', () => {
    assert.throws(() => requireSheetsAccess({organizationId:'other',role:'owner'},'org'), {status:403})
    assert.throws(() => requireSheetsAccess({organizationId:'org',role:'member'},'org'), {status:403})
    assert.throws(() => requireSheetsAccess({organizationId:'org',role:'owner'},undefined), {status:403})
    assert.doesNotThrow(() => requireSheetsAccess({organizationId:'org',role:'owner'},'org'))
})
test('request field allowlist rejects tenant and role injection', () => {
    assert.throws(() => pickFields({ name:'Valid',organization_id:'other' },['name']),{status:400})
    assert.throws(() => pickFields({ role:'owner' },['name']),{status:400})
    assert.deepEqual(pickFields({ name:'Valid' },['name']),{ name:'Valid' })
})
test('OAuth state is random, cookie-bound and user-bound', () => {
    const state=createOAuthState('user-a')
    assert.notEqual(state,createOAuthState('user-a'))
    assert.equal(validOAuthState(state,state,'user-a'),true)
    assert.equal(validOAuthState(state,state,'user-b'),false)
    assert.equal(validOAuthState(state,state.slice(0,-1)+'x','user-a'),false)
    assert.equal(validOAuthState(state,undefined,'user-a'),false)
    assert.equal(validOAuthState('', '', 'user-a'),false)
    assert.equal(validOAuthState('user-a.x','user-a.é','user-a'),false)
})
test('lead payload uses database fields and rejects invalid business inputs', () => {
    const payload=leadPayload({ name:' Acme ',deal_value:'1250.50',next_followup:'',email:'buyer@example.com',organization_id:'forged' })
    assert.deepEqual(payload,{name:'Acme',deal_value:1250.5,next_followup:null,email:'buyer@example.com'})
    assert.throws(() => leadPayload({name:'',deal_value:1}))
    assert.throws(() => leadPayload({name:'A',deal_value:-1}))
    assert.throws(() => leadPayload({name:'A',deal_value:'NaN'}))
    assert.throws(() => leadPayload({name:'A',status:'FAKE'}))
    assert.throws(() => leadPayload({name:'A',email:'bad'}))
    assert.deepEqual(leadPayload({status:'WON'},true),{status:'WON'})
})
