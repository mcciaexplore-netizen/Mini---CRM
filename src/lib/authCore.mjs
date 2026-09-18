import { betterAuth } from 'better-auth'
import { randomUUID } from 'node:crypto'
export function createAppAuth(database, env = process.env) {
    if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) throw new Error('Set BETTER_AUTH_SECRET to a random value of at least 32 characters.')
    const baseURL=env.BETTER_AUTH_URL || env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const mailConfigured=Boolean(env.RESEND_API_KEY && env.EMAIL_FROM)
    async function sendMail(to,subject,url) {
        const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,text:subject+'\n\n'+url})})
        if(!result.ok) throw new Error('Email delivery failed.')
    }
    return betterAuth({
        appName:'ProMarketer', baseURL, secret:env.BETTER_AUTH_SECRET, database,
        trustedOrigins:[new URL(baseURL).origin],
        advanced:{database:{generateId:()=>randomUUID()}},
        emailAndPassword:{enabled:true,minPasswordLength:8,requireEmailVerification:mailConfigured,
            ...(mailConfigured ? {sendResetPassword:async({user,url})=>sendMail(user.email,'Reset your ProMarketer password',url)} : {})},
        ...(mailConfigured ? {emailVerification:{sendOnSignUp:true,autoSignInAfterVerification:true,sendVerificationEmail:async({user,url})=>sendMail(user.email,'Verify your ProMarketer email',url)}} : {}),
        session:{cookieCache:{enabled:false},expiresIn:60*60*24*7,updateAge:60*60*24},
        rateLimit:{enabled:true,storage:'database',window:60,max:100,customRules:{'/sign-in/email':{window:60,max:10},'/sign-up/email':{window:60,max:5}}}
    })
}
