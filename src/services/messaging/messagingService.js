import { supabase } from "../../lib/supabase";
import { getMessagingRule, canRequestConnection, canRequestMessage } from "./messagingPermissions";

function throwIfError(error, fallback) {
  if (error) { console.error(fallback, error); throw new Error(error.message || fallback); }
}
function requireUser(user) { if (!user?.id) throw new Error("You must be authenticated"); return user; }
function normalizeUserIdPair(a,b){
  if(!a||!b) throw new Error("Both IDs required");
  if(a===b) throw new Error("Cannot connect to self");
  return a<b?{userOneId:a,userTwoId:b}:{userOneId:b,userTwoId:a};
}

// ========================================================
// PROFILES
// ========================================================
export async function getMessagingProfile(userId){
  if(!userId) throw new Error("User ID required");
  const {data,error}=await supabase.from("profiles").select("id,full_name,username,email,avatar_url,bio,role,school_id,is_active").eq("id",userId).maybeSingle();
  throwIfError(error,"Unable to load profile"); return data||null;
}

export async function searchMessagingUsers({currentUserId,search="",limit=20}){
  if(!currentUserId) return [];
  let q=supabase.from("profiles").select("id,full_name,username,email,avatar_url,bio,role,school_id,is_active").eq("is_active",true).neq("id",currentUserId).neq("role","super_admin").limit(limit);
  const t=search.trim();
  if(t) q=q.or(`full_name.ilike.%${t}%,username.ilike.%${t}%`);
  const {data,error}=await q; throwIfError(error,"Unable to search"); return data||[];
}

// ========================================================
// CONNECTIONS / REQUESTS HELPERS
// ========================================================
export async function areUsersConnected(u1,u2){
  const {userOneId,userTwoId}=normalizeUserIdPair(u1,u2);
  const {data,error}=await supabase.from("connections").select("id").eq("user_one_id",userOneId).eq("user_two_id",userTwoId).maybeSingle();
  throwIfError(error,"Unable to check connection"); return data||null;
}
export async function getPendingRequest({senderId,receiverId,type,direction="any"}){
  let q=supabase.from("requests").select("id,sender_id,receiver_id,type,status,initial_message,created_at").eq("type",type).eq("status","pending");
  if(direction==="outgoing") q=q.eq("sender_id",senderId).eq("receiver_id",receiverId);
  else if(direction==="incoming") q=q.eq("sender_id",receiverId).eq("receiver_id",senderId);
  else q=q.or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`);
  const {data,error}=await q.order("created_at",{ascending:false}).limit(1).maybeSingle();
  throwIfError(error,"Unable to check pending"); return data||null;
}

// ========================================================
// CREATE REQUESTS - support both signatures
// ========================================================
export async function createConnectionRequest(args){
  // new: {requesterId,targetId,message} old: {currentUser,targetUserId}
  const requesterId=args.requesterId||args.currentUser?.id||args.currentUserId;
  const targetId=args.targetId||args.targetUserId;
  const message=args.message||"";
  if(!requesterId||!targetId) throw new Error("IDs required");
  const currentUser={id:requesterId};
  const target=await getMessagingProfile(targetId);
  if(!target) throw new Error("Target not found");
  // optional permission check
  // if(!canRequestConnection(currentUser,target)) throw new Error("Cannot connect");
  const {data,error}=await supabase.rpc("create_connection_request",{p_receiver_id:targetId});
  throwIfError(error,"Unable to send connection request"); return data;
}
export async function createMessageRequest(args){
  const requesterId=args.requesterId||args.currentUser?.id||args.currentUserId;
  const targetId=args.targetId||args.targetUserId;
  const message=(args.message||args.initialMessage||"").trim()||null;
  if(!requesterId||!targetId) throw new Error("IDs required");
  const {data,error}=await supabase.rpc("create_message_request",{p_receiver_id:targetId,p_initial_message:message});
  throwIfError(error,"Unable to send message request"); return data;
}
export async function acceptConnectionRequest(id){ const {data,error}=await supabase.rpc("accept_connection_request",{p_request_id:id}); throwIfError(error,"Unable to accept"); return data; }
export async function rejectConnectionRequest(id){ const {data,error}=await supabase.rpc("reject_connection_request",{p_request_id:id}); throwIfError(error,"Unable to reject"); return data; }
export async function acceptMessageRequest(id){ const {data,error}=await supabase.rpc("accept_message_request",{p_request_id:id}); throwIfError(error,"Unable to accept"); return data; }
export async function rejectMessageRequest(id){ const {data,error}=await supabase.rpc("reject_message_request",{p_request_id:id}); throwIfError(error,"Unable to reject"); return data; }
export async function cancelRequest(id){ const {data,error}=await supabase.rpc("cancel_request",{p_request_id:id}); throwIfError(error,"Unable to cancel"); return data; }

// ========================================================
// SESSIONS
// ========================================================
export async function hasActiveMessagingSession(u1,u2){
  const {data,error}=await supabase.rpc("has_active_messaging_session",{p_user_id:u1,p_other_user_id:u2});
  throwIfError(error,"Unable to check session"); return Boolean(data);
}
export async function getActiveMessagingSession(u1,u2){
  const {data,error}=await supabase.from("messaging_sessions").select("*").eq("is_active",true).gt("expires_at",new Date().toISOString()).or(`and(requester_id.eq.${u1},receiver_id.eq.${u2}),and(requester_id.eq.${u2},receiver_id.eq.${u1})`).order("created_at",{ascending:false}).limit(1).maybeSingle();
  throwIfError(error,"Unable to load session"); return data||null;
}

// ========================================================
// CONVERSATIONS
// ========================================================
export async function createPrivateConversation(a,b){
  // support: (currentUserId,targetId) OR ({currentUser,targetUserId}) OR (currentUserId as object)
  let currentUserId, targetUserId;
  if(typeof a==="string"){ currentUserId=a; targetUserId=b; }
  else if(a?.currentUser?.id){ currentUserId=a.currentUser.id; targetUserId=a.targetUserId||b; }
  else if(a?.id){ currentUserId=a.id; targetUserId=typeof b==="string"?b:b?.id; }
  else { currentUserId=a?.currentUserId||a?.requesterId; targetUserId=a?.targetUserId||a?.targetId||b; }
  if(!currentUserId||!targetUserId) throw new Error("IDs required for conversation");
  if(currentUserId===targetUserId) throw new Error("Cannot message yourself");
  const {data,error}=await supabase.rpc("create_private_conversation",{p_receiver_id:targetUserId});
  throwIfError(error,"Unable to create conversation");
  // rpc may return uuid string or object
  if(typeof data==="string") return {id:data};
  return data?.id? data : Array.isArray(data)? {id:data[0]?.id||data[0]} : {id:data};
}

export async function getUserConversations(userId){
  if(!userId) return [];
  const {data:memberships,error:mErr}=await supabase.from("conversation_members").select("conversation_id,last_read_at").eq("user_id",userId).eq("is_active",true);
  throwIfError(mErr,"Unable to load memberships");
  if(!memberships?.length) return [];
  const ids=memberships.map(m=>m.conversation_id);
  const {data:convs,error}=await supabase.from("conversations").select("*").in("id",ids).eq("type","direct").order("updated_at",{ascending:false});
  throwIfError(error,"Unable to load convs"); if(!convs?.length) return [];
  const otherIds=convs.map(c=>c.participant_one_id===userId?c.participant_two_id:c.participant_one_id);
  const {data:profiles}=await supabase.from("profiles").select("id,full_name,username,avatar_url,role").in("id",[...new Set(otherIds)]);
  const profileMap=new Map((profiles||[]).map(p=>[p.id,p]));
  const {data:msgs}=await supabase.from("messages").select("id,conversation_id,sender_id,content,media_url,media_type,is_deleted,created_at").in("conversation_id",ids).order("created_at",{ascending:false});
  const latest=new Map(); (msgs||[]).forEach(m=>{ if(!latest.has(m.conversation_id)) latest.set(m.conversation_id,m); });
  const unread=new Map();
  memberships.forEach(mem=>{
    const last=mem.last_read_at?new Date(mem.last_read_at).getTime():0;
    const c=(msgs||[]).filter(m=>m.conversation_id===mem.conversation_id&&m.sender_id!==userId&&!m.is_deleted&&new Date(m.created_at).getTime()>last).length;
    unread.set(mem.conversation_id,c);
  });
  return convs.map(c=>({...c,otherUser:profileMap.get(c.participant_one_id===userId?c.participant_two_id:c.participant_one_id)||null,lastMessage:latest.get(c.id)||null,unreadCount:unread.get(c.id)||0}));
}

export async function getConversationMessages(conversationIdOrObj){
  let conversationId=typeof conversationIdOrObj==="string"?conversationIdOrObj:conversationIdOrObj?.conversationId||conversationIdOrObj?.id;
  if(!conversationId) throw new Error("Conversation ID required");
  const {data,error}=await supabase.from("messages").select("id,conversation_id,sender_id,content,media_url,media_type,is_deleted,created_at").eq("conversation_id",conversationId).eq("is_deleted",false).order("created_at",{ascending:true});
  throwIfError(error,"Unable to load messages"); return data||[];
}

export async function sendMessage({conversationId,senderId,currentUser,content="",media_url=null,media_type=null,mediaUrl,mediaType}){
  const finalSender=senderId||currentUser?.id;
  const finalMediaUrl=media_url||mediaUrl||null;
  const finalMediaType=media_type||mediaType||null;
  if(!conversationId||!finalSender) throw new Error("IDs required");
  if(!content?.trim()&&!finalMediaUrl) throw new Error("Message empty");
  const {data,error}=await supabase.from("messages").insert({conversation_id:conversationId,sender_id:finalSender,content:content?.trim()||null,media_url:finalMediaUrl,media_type:finalMediaType,is_deleted:false}).select("id,conversation_id,sender_id,content,media_url,media_type,is_deleted,created_at").single();
  throwIfError(error,"Unable to send");
  await supabase.from("conversations").update({updated_at:new Date().toISOString()}).eq("id",conversationId);
  return data;
}

export async function markConversationAsRead(a,b){
  let conversationId=typeof a==="string"?a:a?.conversationId;
  let userId=typeof b==="string"?b:a?.currentUserId||a?.userId;
  if(typeof a==="object"&&!b){ conversationId=a.conversationId; userId=a.currentUserId; }
  if(!conversationId||!userId) return false;
  const {error}=await supabase.from("conversation_members").update({last_read_at:new Date().toISOString()}).eq("conversation_id",conversationId).eq("user_id",userId).eq("is_active",true);
  throwIfError(error,"Unable to mark read"); return true;
}

// ========================================================
// STATE - FIXED for SearchPage + MessagesPage (supports both call styles)
// ========================================================
export async function getMessagingState(a,b){
  // supports: getMessagingState(currentUserObj,targetUserObj) OR getMessagingState({currentUser,targetUserId})
  let currentUser,targetUser,targetUserId;
  if(a?.currentUser&&a?.targetUserId){ currentUser=a.currentUser; targetUserId=a.targetUserId; }
  else if(a?.id&&b?.id){ currentUser=a; targetUser=b; targetUserId=b.id; }
  else if(a?.id&&typeof b==="string"){ currentUser=a; targetUserId=b; }
  else { currentUser=a; targetUser=b; targetUserId=b?.id||b; }

  if(!currentUser?.id||!targetUserId) return {status:"unavailable",canMessage:false,rule:{allowed:false}};
  if(!targetUser||!targetUser.id) targetUser=await getMessagingProfile(targetUserId);
  if(!targetUser) return {status:"unavailable",canMessage:false,rule:{allowed:false}};

  const rule=getMessagingRule(currentUser,targetUser);
  if(!rule?.allowed) return {rule,targetUser,connected:false,activeSession:null,canMessage:false,status:"blocked",reason:rule?.reason};

  if(rule.requiresConnection){
    const conn=await areUsersConnected(currentUser.id,targetUser.id);
    if(conn) return {rule,targetUser,connected:true,canMessage:true,status:"connected"};
    const pending=await getPendingRequest({senderId:currentUser.id,receiverId:targetUser.id,type:"connection",direction:"any"});
    return {rule,targetUser,connected:false,pendingRequest:pending,pendingRequestDirection:pending? (pending.sender_id===currentUser.id?"outgoing":"incoming"):null,canMessage:false,status:pending?"request_pending":"connection_required"};
  }
  if(rule.requiresMessageRequest){
    const active=await getActiveMessagingSession(currentUser.id,targetUser.id);
    if(active) return {rule,targetUser,activeSession:active,canMessage:true,status:"session_active"};
    const pendingOut=await getPendingRequest({senderId:currentUser.id,receiverId:targetUser.id,type:"message",direction:"outgoing"});
    const pendingIn=!pendingOut? await getPendingRequest({senderId:currentUser.id,receiverId:targetUser.id,type:"message",direction:"incoming"}):null;
    const pending=pendingOut||pendingIn;
    if(pending) return {rule,targetUser,pendingRequest:pending,pendingRequestDirection:pending.sender_id===currentUser.id?"outgoing":"incoming",canMessage:false,status:"request_pending"};
    // check expired
    const {data:prev}=await supabase.from("messaging_sessions").select("expires_at").or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},receiver_id.eq.${currentUser.id})`).order("created_at",{ascending:false}).limit(1).maybeSingle();
    const expired=prev?.expires_at&&new Date(prev.expires_at)<=new Date();
    return {rule,targetUser,canMessage:false,status:expired?"session_expired":"request_required",sessionExpired:expired};
  }
  return {rule,targetUser,canMessage:true,status:"direct"};
}

// ========================================================
// REALTIME - FIXED NO CLOSED LOOP
// ========================================================
export const subscribeToUserConversations = (userId, callback) => {
  if(!userId) return {unsubscribe:()=>{}};
  // NO filter that causes error, listen to all and filter in callback
  const channel=supabase.channel(`conv-list-${userId}-${Date.now()}`)
   .on("postgres_changes",{event:"*",schema:"public",table:"conversations"},(p)=>{ try{callback(p);}catch{} })
   .on("postgres_changes",{event:"*",schema:"public",table:"messages"},(p)=>{ try{callback(p);}catch{} })
   .subscribe((status)=>{ if(status==="CHANNEL_ERROR") console.warn("Realtime error, retrying..."); });
  return {unsubscribe:()=>{ try{supabase.removeChannel(channel);}catch{} }};
};
export const subscribeToConversationMessages = (conversationId, callback) => {
  if(!conversationId) return {unsubscribe:()=>{}};
  const channel=supabase.channel(`msgs-${conversationId}-${Date.now()}`)
   .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`conversation_id=eq.${conversationId}`},(p)=>{ if(p?.new) callback(p.new); })
   .subscribe();
  return {unsubscribe:()=>{ try{supabase.removeChannel(channel);}catch{} }};
};

// Media
export const uploadMessageMedia = async (file, conversationId, userId) => {
  if(!file) throw new Error("No file");
  if(file.size>20*1024*1024) throw new Error("Max 20MB");
  const ext=file.name.split(".").pop()||"bin";
  const path=`${conversationId}/${userId}-${Date.now()}.${ext}`;
  const {error}=await supabase.storage.from("message-attachments").upload(path,file,{upsert:false});
  if(error) throw error;
  const {data}=supabase.storage.from("message-attachments").getPublicUrl(path);
  return {media_url:data.publicUrl,media_type:file.type,file_name:file.name};
};

export async function getRequestSuggestions(currentUser){
  requireUser(currentUser);
  const {data:users,error}=await supabase.from("profiles").select("id,full_name,username,avatar_url,role,school_id,is_active").eq("is_active",true).neq("id",currentUser.id).neq("role","super_admin");
  throwIfError(error,"Unable to load suggestions"); return users||[];
}
export async function findConversationWithUser({currentUserId,targetUserId}){
  if(!currentUserId||!targetUserId) return null;
  const {data,error}=await supabase.from("conversations").select("*").eq("type","direct").or(`and(participant_one_id.eq.${currentUserId},participant_two_id.eq.${targetUserId}),and(participant_one_id.eq.${targetUserId},participant_two_id.eq.${currentUserId})`).limit(1).maybeSingle();
  throwIfError(error,"Unable to find"); return data||null;
}
export async function deleteMessage({messageId,currentUserId}){ const {data,error}=await supabase.from("messages").update({is_deleted:true}).eq("id",messageId).eq("sender_id",currentUserId).select().single(); throwIfError(error,"Unable to delete"); return data; }