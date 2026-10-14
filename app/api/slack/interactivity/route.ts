import { readSignedSlackForm } from '@/lib/security/slack-signature';
export async function POST(req:Request){ if(!(await readSignedSlackForm(req))) return new Response('Ogiltig Slack-signatur.',{status:401}); return Response.json({ok:true}); }
