import { WebClient } from '@slack/web-api';
export const slackClient = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;
export async function postSlackAnnouncement(text:string){ if(!slackClient || !process.env.SLACK_CHANNEL_ID) return {posted:false}; const res=await slackClient.chat.postMessage({channel:process.env.SLACK_CHANNEL_ID,text}); return {posted:true,ts:res.ts}; }
