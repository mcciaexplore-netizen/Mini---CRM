import {authClient} from './authClient'
export async function requestData(url,options){
    const response=await fetch(url,{cache:'no-store',...options})
    const result=await response.json()
    if(!response.ok||result.error)throw new Error(result.error||'The request failed.')
    return result.data
}
const send=(url,method,body)=>requestData(url,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})})
const withId=(url,id)=>url+'?id='+encodeURIComponent(id)
export const signIn=(email,password)=>authClient.signIn.email({email,password})
export const signUp=(email,password,fullName)=>authClient.signUp.email({email,password,name:fullName})
export async function signOut(){const {error}=await authClient.signOut();if(error)throw new Error(error.message)}
export const getSession=()=>authClient.getSession()
export const getCurrentProfile=()=>requestData('/api/me')
export const getTeamMembers=()=>requestData('/api/team')
export const updateProfile=(_id,updates)=>send('/api/me','PATCH',updates)
export const getSpaces=()=>requestData('/api/spaces')
export const createSpace=space=>send('/api/spaces','POST',space)
export const updateSpace=(id,updates)=>send(withId('/api/spaces',id),'PATCH',updates)
export const deleteSpace=id=>send(withId('/api/spaces',id),'DELETE')
export const getLeads=spaceId=>requestData('/api/leads'+(spaceId?'?spaceId='+encodeURIComponent(spaceId):''))
export const createLead=lead=>send('/api/leads','POST',lead)
export const updateLead=(id,updates)=>send(withId('/api/leads',id),'PATCH',updates)
export const deleteLead=id=>send(withId('/api/leads',id),'DELETE')
export const moveLeadOnBoard=(id,status,position)=>updateLead(id,{status,position})
export const getActivities=leadId=>requestData('/api/activities?leadId='+encodeURIComponent(leadId))
export const logActivity=activity=>send('/api/activities','POST',activity)
export const getNotifications=()=>requestData('/api/notifications')
export const markNotificationRead=id=>send(withId('/api/notifications',id),'PATCH')
export const getBusinessProfile=()=>requestData('/api/profile')
export const updateBusinessProfile=updates=>send('/api/profile','POST',updates)
export const getScheduledPosts=()=>requestData('/api/scheduler/posts')
export const createScheduledPost=post=>send('/api/scheduler/posts','POST',post)
export const updateScheduledPost=(id,updates)=>send(withId('/api/scheduler/posts',id),'PATCH',updates)
export const deleteScheduledPost=id=>send(withId('/api/scheduler/posts',id),'DELETE')
export const getDashboard=()=>requestData('/api/dashboard')
export async function getGoogleCalendarStatus(){
    const [status,profile]=await Promise.all([requestData('/api/settings/google-calendar'),getBusinessProfile()])
    return {...status,autoSync:profile.google_calendar_auto_sync??true,campaignStorageProvider:profile.campaign_storage_provider||'neon'}
}
