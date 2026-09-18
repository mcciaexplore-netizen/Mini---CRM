import LoginForm from './LoginForm'
export const dynamic='force-dynamic'
export default function LoginPage(){
    return <LoginForm configured={Boolean(process.env.DATABASE_URL&&process.env.BETTER_AUTH_SECRET)} />
}
