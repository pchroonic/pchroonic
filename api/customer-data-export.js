const {db,requireCustomer,safeError}=require('../lib/server');

async function safeRows(path){try{return await db(path)||[]}catch(error){console.warn('Privacy export section unavailable:',path.split('?')[0],error?.status||'',error?.message||error);return[]}}
function ids(rows=[]){return rows.map(x=>x.id).filter(Boolean)}
function inFilter(values=[]){return values.map(x=>encodeURIComponent(x)).join(',')}

module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET'){res.statusCode=405;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify({ok:false,error:'Method not allowed'}));return}
    const {user,profile}=await requireCustomer(req),uid=encodeURIComponent(user.id),email=String(user.email||profile.email||'').trim().toLowerCase(),mail=encodeURIComponent(email);
    const [quotes,bookings,projects,subscriptions,messages,tickets,ledger,invoices,payments,newsletter,privacyRequests,deletionRequests,chatSessions]=await Promise.all([
      safeRows(`quotes?or=(customer_id.eq.${uid},email.eq.${mail})&select=id,customer_id,customer_name,email,phone,postcode,service_key,inputs,automatic_estimate,final_price,status,created_at,updated_at,promo_code,promo_discount,reward_code,reward_discount,gross_estimate,net_estimate,expires_at,customer_response,customer_responded_at,customer_response_note,customer_quote_note,sent_at&order=created_at.desc`),
      safeRows(`bookings?customer_id=eq.${uid}&select=id,quote_id,starts_at,ends_at,address,status,payment_status,created_at,work_status,on_my_way_at,started_at,completed_at,customer_note&order=created_at.desc`),
      safeRows(`customer_projects?customer_id=eq.${uid}&select=id,quote_id,booking_id,service_key,title,property_label,description,status,final_price,tour_url,embed_url,customer_comment,customer_rating,public_shared,show_price,completed_at,created_at,updated_at&order=created_at.desc`),
      safeRows(`service_subscriptions?customer_id=eq.${uid}&select=id,service_key,interval_key,status,price_per_visit,starts_on,next_service_on,address,notes,points_awarded_at,created_at,updated_at&order=created_at.desc`),
      safeRows(`customer_messages?or=(customer_id.eq.${uid},recipient_email.eq.${mail})&select=id,recipient_email,subject,body_text,category,target_path,delivery_status,read_at,archived_at,sent_at,created_at&order=created_at.desc`),
      safeRows(`support_tickets?or=(customer_id.eq.${uid},guest_email.eq.${mail})&select=id,ticket_no,guest_email,guest_name,subject,category,priority,status,last_staff_reply_at,last_customer_reply_at,created_at,updated_at,closed_at,source&order=created_at.desc`),
      safeRows(`loyalty_ledger?customer_id=eq.${uid}&select=id,points,reason,reference_type,reference_id,created_at&order=created_at.desc`),
      safeRows(`invoices?customer_id=eq.${uid}&select=id,booking_id,quote_id,invoice_number,currency,total,amount_paid,status,issued_at,due_at,paid_at,notes,created_at,updated_at&order=created_at.desc`),
      safeRows(`payment_records?customer_id=eq.${uid}&select=id,booking_id,invoice_id,direction,payment_kind,method,amount,reference,paid_at,created_at&order=created_at.desc`),
      safeRows(`newsletter_subscribers?email=eq.${mail}&select=id,status,source,consent_at,confirmed_at,unsubscribed_at,created_at,updated_at,preferences,preferences_updated_at`),
      safeRows(`privacy_requests?customer_id=eq.${uid}&select=id,request_type,details,identity_status,status,source,requested_at,due_at,completed_at,response_summary,created_at,updated_at&order=requested_at.desc`),
      safeRows(`account_deletion_requests?customer_id=eq.${uid}&select=id,status,requested_at,verified_at,delete_after,recovered_at&order=requested_at.desc`),
      safeRows(`chat_sessions?customer_id=eq.${uid}&select=id,guest_name,guest_email,status,mode,created_at,updated_at,closed_at&order=created_at.desc`)
    ]);
    const ticketIds=ids(tickets),chatIds=ids(chatSessions);
    const [ticketMessages,chatMessages]=await Promise.all([
      ticketIds.length?safeRows(`support_ticket_messages?ticket_id=in.(${inFilter(ticketIds)})&select=id,ticket_id,sender_role,sender_name,sender_email,message,created_at&order=created_at.asc`):[],
      chatIds.length?safeRows(`chat_messages?session_id=in.(${inFilter(chatIds)})&select=id,session_id,sender_role,message,created_at&order=created_at.asc`):[]
    ]);
    const exportData={
      metadata:{generatedAt:new Date().toISOString(),accountId:user.id,format:'Namdar customer account data copy v1',notice:'This self-service file contains the main customer-facing information linked to your authenticated Namdar account. If you need a formal subject access response or believe information is missing, submit an Access request in My Namdar Privacy & data.'},
      profile:{id:profile.id,fullName:profile.full_name||null,email:user.email||profile.email||null,phone:profile.phone||null,addressLine1:profile.address_line1||null,addressLine2:profile.address_line2||null,city:profile.city||null,postcode:profile.postcode||null,propertyType:profile.property_type||null,countryCode:profile.country_code||null,region:profile.region||null,district:profile.district||null,addressVerified:!!profile.address_verified,phoneVerified:!!profile.phone_verified,postcodeVerified:!!profile.postcode_verified,marketingOptIn:!!profile.marketing_opt_in,marketingOptInAt:profile.marketing_opt_in_at||null,accountStatus:profile.account_status||'active',referralCode:profile.referral_code||null,pointsBalance:Number(profile.points_balance||0),lifetimePoints:Number(profile.lifetime_points||0),createdAt:profile.created_at||null,updatedAt:profile.updated_at||null},
      quotes:(quotes||[]).map(({photo_paths,...q})=>({...q,photoCount:Array.isArray(photo_paths)?photo_paths.length:0})),
      bookings,projects,subscriptions,
      notificationsAndEmails:messages,
      support:{tickets,messages:ticketMessages},
      rewards:ledger,
      billing:{invoices,payments},
      newsletter,
      chats:{sessions:chatSessions,messages:chatMessages},
      privacyRequests,
      accountDeletionRequests:deletionRequests
    };
    const body=JSON.stringify(exportData,null,2),stamp=new Date().toISOString().slice(0,10);
    res.statusCode=200;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="namdar-account-data-${stamp}.json"`);res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(body);
  }catch(error){return safeError(res,error)}
};
