"use client"
import {useState} from 'react'
import {authClient} from '@/lib/authClient'
export default function LoginForm({configured}){
    const [mode,setMode]=useState('login'),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
    async function submit(event){
        event.preventDefault();setBusy(true);setMessage('')
        const form=new FormData(event.currentTarget)
        try{
            const email=form.get('email').trim(),password=form.get('password')
            const result=mode==='signup'
                ?await authClient.signUp.email({email,password,name:form.get('name').trim(),callbackURL:'/'})
                :await authClient.signIn.email({email,password,callbackURL:'/'})
            if(result.error)throw new Error(result.error.message)
            const session=await authClient.getSession()
            if(session.data?.user)window.location.assign('/')
            else setMessage('Check your email to confirm your account, then sign in.')
        }catch(error){setMessage(error.message)}
        finally{setBusy(false)}
    }
    return <div className="w-full max-w-md bg-white p-8 rounded-xl border shadow-sm">
        <h1 className="text-2xl font-bold">Welcome to ProMarketer</h1>
        <p className="text-gray-600 mt-2 mb-6">{mode==='signup'?'Create your account to set up your business.':'Sign in to your business workspace.'}</p>
        {!configured&&<p role="alert" className="mb-4 text-red-700">Configure Neon DATABASE_URL and BETTER_AUTH_SECRET using the README before signing in.</p>}
        <form onSubmit={submit} className="space-y-4">
            {mode==='signup'&&<label className="block">Full name<input name="name" autoComplete="name" required maxLength={120} className="input-field mt-1" /></label>}
            <label className="block">Email<input name="email" type="email" autoComplete="email" required className="input-field mt-1" /></label>
            <label className="block">Password<input name="password" type="password" autoComplete={mode==='signup'?'new-password':'current-password'} required minLength={8} className="input-field mt-1" /></label>
            <button disabled={busy||!configured} className="btn-primary w-full justify-center">{busy?'Please wait…':mode==='signup'?'Create account':'Sign in'}</button>
        </form>
        {message&&<p role="status" className="mt-4 text-sm">{message}</p>}
        <button disabled={busy} onClick={()=>{setMode(mode==='signup'?'login':'signup');setMessage('')}} className="mt-5 text-sm text-blue-700 underline">{mode==='signup'?'Already have an account? Sign in':'Create a new business account'}</button>
    </div>
}
