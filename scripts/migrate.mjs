import pg from 'pg'
import nextEnv from '@next/env'
import {readFile,readdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
nextEnv.loadEnvConfig(process.cwd())
const connectionString=process.env.DIRECT_DATABASE_URL||process.env.DATABASE_URL
if(!connectionString)throw new Error('Set DATABASE_URL (and optionally DIRECT_DATABASE_URL) in .env.local.')
const client=new pg.Client({connectionString,connectionTimeoutMillis:10000})
try{
 await client.connect()
 await client.query('BEGIN')
 await client.query("SELECT pg_advisory_xact_lock(hashtextextended('promarketer_schema_migrations',0))")
 await client.query('CREATE TABLE IF NOT EXISTS public.schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())')
 const dir=new URL('../neon/migrations/',import.meta.url)
 for(const name of (await readdir(dir)).filter(n=>n.endsWith('.sql')).sort()){
  const sql=await readFile(new URL(name,dir),'utf8')
  const checksum=createHash('sha256').update(sql).digest('hex')
  const {rows}=await client.query('SELECT checksum FROM public.schema_migrations WHERE name=$1',[name])
  if(rows.length){
   if(rows[0].checksum!==checksum)throw new Error('Applied migration changed: '+name+'. Add a new migration instead.')
   console.log('Already applied: '+name);continue
  }
  await client.query(sql)
  await client.query('INSERT INTO public.schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum])
  console.log('Applied: '+name)
 }
 await client.query('COMMIT')
 console.log('Neon schema is ready.')
}catch(error){
 await client.query('ROLLBACK').catch(()=>{})
 console.error('Migration failed; transaction rolled back:',error.code||error.message)
 process.exitCode=1
}finally{await client.end()}
