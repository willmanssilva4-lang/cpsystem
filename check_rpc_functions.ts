import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing credentials');
  process.exit(1);
}

async function check() {
  console.log('Fetching Swagger with Service Role Key...');
  const res = await fetch(`${url}/rest/v1/`, { 
    headers: { 
      apikey: serviceKey!,
      Authorization: `Bearer ${serviceKey}`
    } 
  });
  
  if (!res.ok) {
    console.log('HTTP Error:', res.status, res.statusText);
    const body = await res.text();
    console.log('Body:', body);
    return;
  }

  const data = await res.json();
  if (data.paths) {
    const rpcPaths = Object.keys(data.paths).filter(p => p.startsWith('/rpc/'));
    console.log('Found RPC functions:', rpcPaths);
    
    // Check parameters for each rpc function
    rpcPaths.forEach(p => {
      const func = data.paths[p];
      if (func.post && func.post.parameters) {
        console.log(`Parameters for ${p}:`, func.post.parameters.map((param: any) => param.name));
      }
    });
  } else {
    console.log('No paths found in swagger.');
  }
}
check();
