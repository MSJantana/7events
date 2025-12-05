import { Router, Request, Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { signJwt } from '../middlewares/auth'
import { Role } from '@prisma/client'
import { randomBytes, scryptSync } from 'node:crypto'
import { getGoogleAuthUrl, handleGoogleCallback } from '../modules/auth/auth.service'
import { audit } from '../utils/audit'
import { prisma } from '../prisma'
import { logError, logInfo } from '../utils/logger'
import { localRegisterSchema, localLoginSchema } from '../utils/validation'

const router = Router()

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body as { idToken?: string }
    if (!idToken) return res.status(400).json({ error: 'idToken_required' })
    if (!env.GOOGLE_CLIENT_ID)
      return res.status(500).json({ error: 'google_client_id_missing' })

    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID)
    const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    if (!payload?.email || !payload?.name) return res.status(400).json({ error: 'invalid_google_payload' })

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: { name: payload.name },
      create: { email: payload.email, name: payload.name, role: Role.PARTICIPANT }
    })

    if (payload.sub) {
      await prisma.userGoogle.upsert({
        where: { sub: payload.sub },
        update: { email: payload.email, name: payload.name, userId: user.id },
        create: { sub: payload.sub, email: payload.email, name: payload.name, userId: user.id }
      })
    }

    const token = signJwt({ sub: user.id, role: user.role })
    return res.json({ token, user })
  } catch (e: any) {
    let alg: string | undefined
    try {
      const h = String(req.body?.idToken || '').split('.')[0]
      if (h) {
        const b = Buffer.from(h.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
        const j = JSON.parse(b.toString('utf-8'))
        alg = j?.alg
      }
    } catch {
      alg = undefined
    }
    logError('google_auth_failed', { error: e, ip: req.ip, alg, audience: env.GOOGLE_CLIENT_ID })
    const details = e?.message || e?.response?.data || 'unknown_error'
    return res.status(500).json({ error: 'google_auth_failed', details })   
  }
})

router.get('/google/url', async (_req: Request, res: Response) => {
  try {
    const url = await getGoogleAuthUrl()    
    return res.json({ url })
  } catch {
    return res.status(500).json({ error: 'google_url_failed' })
  }
})

router.get('/google', async (_req: Request, res: Response) => {
  try {
    const url = await getGoogleAuthUrl()
    return res.redirect(url)
  } catch {
    return res.status(500).json({ error: 'google_redirect_failed' })
  }
})

router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
      return res.status(500).json({ error: 'google_env_missing' })
    }
    const code = req.query.code as string
    logInfo('google_code_received', { codeLength: code ? code.length : 0 })
    if (!code) return res.status(400).json({ error: 'code_required' })
    const ip = req.ip
    const result = await handleGoogleCallback(code, ip)
    if (req.query.raw) {
      return res.json(result)
    }
    const isSecure = env.NODE_ENV !== 'development'
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })
    return res.redirect(env.POST_LOGIN_REDIRECT_URL)
  } catch (e: any) {
    logError('google_callback_failed', { error: e, ip: req.ip, clientId: env.GOOGLE_CLIENT_ID, redirectUri: env.GOOGLE_REDIRECT_URI })
    const details = e?.response?.data || e?.message || 'unknown_error'
    return res.status(500).json({ error: 'google_callback_failed', details })
  }
})

router.get('/success', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Security-Policy', "default-src 'self'; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
    res.type('html').send(
      '<!doctype html><html><head><meta charset="utf-8"><title>Testes 7events</title><meta name="viewport" content="width=device-width,initial-scale=1"/>' +
      '<style>body{font-family:system-ui;line-height:1.5;padding:24px;background:#f8fafc;color:#0f172a} .grid{display:grid;gap:12px;max-width:1100px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));margin-top:12px} .card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#ffffff} .btn{display:inline-block;padding:10px 14px;margin:8px 8px 0 0;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;transition:all .15s ease-in-out} .btn:hover{box-shadow:0 1px 4px rgba(0,0,0,.08)} .btn.primary{background:#4f46e5;color:#fff;border-color:#4f46e5} .btn.primary:hover{background:#4338ca;border-color:#4338ca} .btn.success{background:#22c55e;color:#fff;border-color:#22c55e} .btn.success:hover{background:#16a34a;border-color:#16a34a} .btn.warning{background:#f59e0b;color:#1f2937;border-color:#f59e0b} .btn.warning:hover{background:#d97706;border-color:#d97706} .btn.danger{background:#ef4444;color:#fff;border-color:#ef4444} .btn.danger:hover{background:#dc2626;border-color:#dc2626} .btn[disabled]{opacity:.5;cursor:not-allowed;box-shadow:none} input[type=number],input[type=text],input[type=password]{padding:8px;margin:8px 8px 0 0;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f172a} h3{margin:0 0 10px 0;color:#0f172a} .badge{display:inline-block;padding:4px 8px;margin:0 0 8px 0;border-radius:999px;font-size:12px;border:1px solid #cbd5e1} .badge.pending{background:#e2e8f0;color:#334155} .badge.paid{background:#dcfce7;color:#14532d} .badge.canceled{background:#fee2e2;color:#7f1d1d} .badge.refunded{background:#e9d5ff;color:#4c1d95} .badge.none{background:#f1f5f9;color:#64748b}</style></head>' +
      '<body>' +
      '<h1>Testes 7events</h1>' +
      '<p><a href="/health">Backend</a> · <button id="btnMyOrders" class="btn">Meus Pedidos</button> · <button id="btnLogout" class="btn">Logout</button></p>' +
      '<div class="grid">' +
      '<div class="card">' +
      '<h3>Login</h3>' +
      '<button id="btnGoogle" class="btn primary">Login com Google</button>' +
      '<button id="btnAdmin" class="btn">Login JWT (Admin)</button>' +
      '<button id="btnBuyer" class="btn">Login JWT (Comprador)</button>' +
      '<div style="margin-top:8px">' +
      '<input id="localEmail" placeholder="email" />' +
      '<input id="localName" placeholder="nome" />' +
      '<input id="localPass" placeholder="senha" type="password" />' +
      '<button id="btnLocalRegister" class="btn">Registrar Local</button>' +
      '<button id="btnLocalLogin" class="btn">Login Local</button>' +
      '</div>' +
      '</div>' +
      '<div class="card">' +
      '<h3>Fluxo Pago <span id="authPaid" class="badge none" style="margin-left:8px">não autenticado</span></h3>' +
      '<div id="badgePaid" class="badge">—</div>' +
      '<div style="font-size:12px; color:#475569; margin-bottom:8px">TicketType selecionado: <span id="labelPaidTT">—</span></div>' +
      '<div id="summaryPaid" style="font-size:12px; color:#334155; margin:4px 0">Reservados: 0 | Ativos: 0 <a id="actionPaidLink" href="#" class="btn danger" style="padding:4px 8px">-</a></div>' +
      '<button id="btnCreatePaidEvent" class="btn">Criar Evento Pago</button>' +
      '<button id="btnCreatePaidTT" class="btn">Criar TicketType Pago</button>' +
      '<button id="btnPublishPaid" class="btn">Publicar Evento Pago</button>' +
      '<div style="margin-top:8px"><input id="qtyPaid" type="number" min="1" value="2" style="width:80px" />' +
      '<button id="btnOrderPaid" class="btn primary">Comprar N Tickets (Pago)</button></div>' +
      '<button id="btnPayPaid" class="btn success">Pagar Pedido</button>' +
      '<button id="btnCancelPaid" class="btn danger">Cancelar Pedido</button>' +
      '<button id="btnRevertPaid" class="btn warning">Reverter Cancelamento</button>' +
      '<button id="btnRefundPaid" class="btn danger">Refund Pedido</button>' +
      '</div>' +
      '<div class="card">' +
      '<h3>Fluxo Gratuito <span id="authFree" class="badge none" style="margin-left:8px">não autenticado</span></h3>' +
      '<div id="badgeFree" class="badge">—</div>' +
      '<div style="font-size:12px; color:#475569; margin-bottom:8px">TicketType selecionado: <span id="labelFreeTT">—</span></div>' +
      '<div id="summaryFree" style="font-size:12px; color:#334155; margin:4px 0">Reservados: 0 | Ativos: 0 <a id="actionFreeLink" href="#" class="btn danger" style="padding:4px 8px">-</a></div>' +
      '<button id="btnCreateFreeEvent" class="btn">Criar Evento Gratuito</button>' +
      '<button id="btnCreateFreeTT" class="btn">Criar TicketType Gratuito</button>' +
      '<button id="btnPublishFree" class="btn">Publicar Evento Gratuito</button>' +
      '<div style="margin-top:8px"><input id="qtyFree" type="number" min="1" value="2" style="width:80px" />' +
      '<button id="btnOrderFree" class="btn primary">Comprar N Tickets (Gratuito)</button>' +
      '<button id="btnCancelFree" class="btn danger">Cancelar Pedido (Gratuito)</button>' +
      '<button id="btnRefundFree" class="btn danger">Refund Pedido (Gratuito)</button></div>' +
      '</div>' +
      '</div>' +
      '<div style="margin-top:16px"><pre id="out" style="background:#f7f7f7; padding:12px; border-radius:8px; min-height:160px; max-width:100%; overflow:auto"></pre></div>' +
      '<script>\n' +
      'const s = { adminToken:"", buyerToken:"", buyerCookieAuth:false, eventIdPaid:"", ttIdPaid:"", orderIdPaid:"", pricePaid:0, eventIdFree:"", ttIdFree:"", orderIdFree:"", orders:[], ttNamePaid:"", ttNameFree:"", eventNamePaid:"", eventNameFree:"" }\n' +
      'function setDisabled(id, v){ const el = document.getElementById(id); if(el){ el.disabled = !!v } }\n' +
      'function setText(id, v){ const el = document.getElementById(id); if(el){ el.textContent = v || "—" } }\n' +
      'function getStatus(id){ if(!id) return ""; const o=(s.orders||[]).find(x=>x.id===id); return o? o.status: "" }\n' +
      'function updateUI(){ const hasAdmin=!!s.adminToken; const hasBuyer=!!s.buyerToken || !!s.buyerCookieAuth; const canAct=hasBuyer || hasAdmin; const hasPaidEvent=!!s.eventIdPaid; const hasPaidTT=!!s.ttIdPaid; const hasPaidOrder=!!s.orderIdPaid; const hasFreeEvent=!!s.eventIdFree; const hasFreeTT=!!s.ttIdFree; const hasFreeOrder=!!s.orderIdFree; const paidStatus=getStatus(s.orderIdPaid); const freeStatus=getStatus(s.orderIdFree); setDisabled("btnCreatePaidEvent", !hasAdmin); setDisabled("btnCreatePaidTT", !(hasAdmin && hasPaidEvent)); setDisabled("btnPublishPaid", !(hasAdmin && hasPaidEvent)); setDisabled("qtyPaid", !(canAct && hasPaidTT)); setDisabled("btnOrderPaid", !(canAct && hasPaidTT)); setDisabled("btnPayPaid", !(canAct && hasPaidOrder && paidStatus==="PENDING")); setDisabled("btnCancelPaid", !(canAct && hasPaidOrder && paidStatus==="PENDING")); setDisabled("btnRevertPaid", !(canAct && hasPaidOrder && paidStatus==="CANCELED")); setDisabled("btnRefundPaid", !(canAct && hasPaidOrder && paidStatus==="PAID")); setDisabled("btnCreateFreeEvent", !hasAdmin); setDisabled("btnCreateFreeTT", !(hasAdmin && hasFreeEvent)); setDisabled("btnPublishFree", !(hasAdmin && hasFreeEvent)); setDisabled("qtyFree", !(canAct && hasFreeTT)); setDisabled("btnOrderFree", !(canAct && hasFreeTT)); setDisabled("btnCancelFree", !(canAct && hasFreeOrder && freeStatus==="PENDING")); setDisabled("btnRefundFree", !(canAct && hasFreeOrder && freeStatus==="PAID")); setDisabled("btnMyOrders", !(hasBuyer || hasAdmin)); setDisabled("btnLogout", !(hasAdmin || hasBuyer)); const who = hasAdmin? "Admin": (s.buyerToken? "Comprador": (s.buyerCookieAuth? "Google": "não autenticado")); const paidEl=document.getElementById("authPaid"); const freeEl=document.getElementById("authFree"); if(paidEl) paidEl.textContent = who; if(freeEl) freeEl.textContent = who; const cls = who!=="não autenticado"? "badge paid": "badge none"; if(paidEl) paidEl.className=cls; if(freeEl) freeEl.className=cls; }\n' +
      'function log(o){ const el = document.getElementById("out"); el.textContent += (typeof o === "string" ? o : JSON.stringify(o)) + "\\n"; el.scrollTop = el.scrollHeight; }\n' +
      'function setCookie(name, value){ document.cookie = name+"="+encodeURIComponent(value)+"; path=/"; }\n' +
      'async function api(method, url, body, token){ const h={}; if(body){ h["Content-Type"]="application/json" } if(token){ h["Authorization"]="Bearer "+token } const r = await fetch(url,{ method, headers:h, body: body? JSON.stringify(body): undefined }); const t = await r.text(); try{ const j = JSON.parse(t); return { code:r.status, json:j }; } catch{ return { code:r.status, text:t }; } }\n' +
      'async function showOrders(label){ let url="/orders/me"; let token=s.buyerToken; if(s.adminToken){ url="/orders"; token=s.adminToken; } else if(!token && s.buyerCookieAuth){ url="/orders/me"; token=null; } const r = await api("GET",url,null,token); if(r.json){ s.orders=r.json } log({ label, code:r.code, orders:r.json }); updateUI(); updateBadges(); updateSummaries(); }\n' +
      'function fmtDate(iso){ try{ const d=new Date(iso); return d.toLocaleString(); }catch{return ""} }\n' +
      'function fmtMoney(n){ const v=Number(n||0); return "R$ "+v.toFixed(2); }\n' +
      'function lastByStatus(orders, pred){ const arr=(orders||[]).filter(pred); arr.sort((a,b)=> new Date(b.createdAt||b.updatedAt||0).getTime() - new Date(a.createdAt||a.updatedAt||0).getTime()); return arr[0]; }\n' +
      'function updateBadges(){ const paidEl=document.getElementById("badgePaid"); const freeEl=document.getElementById("badgeFree"); const lastPaid=lastByStatus(s.orders, o => (o.tickets||[]).some(t => Number(t.ticketType?.price)>0)); const lastFree=lastByStatus(s.orders, o => (o.tickets||[]).some(t => Number(t.ticketType?.price)===0)); const map={ PENDING:"pending", PAID:"paid", CANCELED:"canceled", REFUNDED:"refunded" }; function setBadge(el, order){ if(!el){ return } if(!order){ el.className="badge none"; el.textContent="-"; return } const status=order.status; const cls=map[status]||"none"; const fallback=(order.tickets||[]).reduce((acc,t)=> acc + Number(t.ticketType?.price||0), 0); const total=Number(order.price ?? fallback); const dt=fmtDate(order.createdAt||order.updatedAt); el.className="badge "+cls; el.textContent = status+" | "+dt+" | "+fmtMoney(total); } setBadge(paidEl, lastPaid); setBadge(freeEl, lastFree); }\n' +
      'function countTickets(order){ const ts=(order?.tickets)||[]; let waiting=0, active=0; for(const t of ts){ if(t.status==="WAITING") waiting++; if(t.status==="ACTIVE") active++; } return { waiting, active }; }\n' +
      'function setActionLink(id, order, type){ const el=document.getElementById(id); if(!el) return; el.onclick=null; if(!order){ el.textContent="-"; el.className="btn"; el.removeAttribute("data-action"); return } if(order.status==="PENDING"){ el.textContent="Cancelar"; el.className="btn danger"; el.setAttribute("data-action","cancel"); el.onclick=async ()=>{ const r=await api("POST","/orders/"+order.id+"/cancel",null,s.buyerToken); log({ [`cancel_${type}`]:r }); await showOrders("after_cancel_"+type); }; } else if(order.status==="PAID"){ el.textContent="Refund"; el.className="btn danger"; el.setAttribute("data-action","refund"); el.onclick=async ()=>{ const r=await api("POST","/orders/"+order.id+"/refund",null,s.buyerToken); log({ [`refund_${type}`]:r }); await showOrders("after_refund_"+type); }; } else { el.textContent="-"; el.className="btn"; el.removeAttribute("data-action"); } }\n' +
      'function updateSummaries(){ const paidSummary=document.getElementById("summaryPaid"); const freeSummary=document.getElementById("summaryFree"); const lastPaid=lastByStatus(s.orders, o => (o.tickets||[]).some(t => Number(t.ticketType?.price)>0)); const lastFree=lastByStatus(s.orders, o => (o.tickets||[]).some(t => Number(t.ticketType?.price)===0)); const p=countTickets(lastPaid); const f=countTickets(lastFree); if(paidSummary){ paidSummary.childNodes[0].nodeValue = "Reservados: "+p.waiting+" | Ativos: "+p.active+" "; } if(freeSummary){ freeSummary.childNodes[0].nodeValue = "Reservados: "+f.waiting+" | Ativos: "+f.active+" "; } setActionLink("actionPaidLink", lastPaid, "paid"); setActionLink("actionFreeLink", lastFree, "free"); }\n' +
      'async function detectAuth(){ const r = await api("GET","/orders/me",null,s.buyerToken); s.buyerCookieAuth = r.code===200; }\n' +
      'async function discoverPublished(){ try{ const r = await api("GET","/events",null,null); const list = Array.isArray(r.json)? r.json: []; const now = Date.now(); const published = list.filter(e=>e.status==="PUBLISHED" && new Date(e.endDate).getTime()>now); for(const e of published){ const tr = await api("GET","/events/"+e.id+"/ticket-types",null,null); const tts = Array.isArray(tr.json)? tr.json: []; const paidArr = tts.filter(t=> Number(t.price)>0 && Number(t.quantity)>0).sort((a,b)=> Number(a.price)-Number(b.price) || Number(b.quantity)-Number(a.quantity)); const freeArr = tts.filter(t=> Number(t.price)===0 && Number(t.quantity)>0).sort((a,b)=> Number(b.quantity)-Number(a.quantity)); const paid = paidArr[0]; const free = freeArr[0]; if(paid && !s.ttIdPaid){ s.eventIdPaid=e.id; s.eventNamePaid=e.title||e.name||""; s.ttIdPaid=paid.id; s.ttNamePaid=paid.name; } if(free && !s.ttIdFree){ s.eventIdFree=e.id; s.eventNameFree=e.title||e.name||""; s.ttIdFree=free.id; s.ttNameFree=free.name; } if(s.ttIdPaid && s.ttIdFree) break; } setText("labelPaidTT", (s.eventNamePaid? ("Evento: "+s.eventNamePaid+" • "): "") + (s.ttNamePaid? ("TT: "+s.ttNamePaid): "")); setText("labelFreeTT", (s.eventNameFree? ("Evento: "+s.eventNameFree+" • "): "") + (s.ttNameFree? ("TT: "+s.ttNameFree): "")); } catch{} }\n' +
      'async function bootstrap(){ await detectAuth(); if(s.buyerCookieAuth){ await discoverPublished(); } updateUI(); }\n' +
      'document.getElementById("btnGoogle").onclick = () => { location.href = "/auth/google" }\n' +
      'document.getElementById("btnMyOrders").onclick = async () => { await showOrders("manual_my_orders"); }\n' +
      'document.getElementById("btnLogout").onclick = async () => { const r = await api("POST","/auth/logout",null,s.buyerToken||s.adminToken); s.adminToken=""; s.buyerToken=""; s.eventIdPaid=""; s.ttIdPaid=""; s.orderIdPaid=""; s.eventIdFree=""; s.ttIdFree=""; s.orderIdFree=""; s.orders=[]; log({ logout:r }); updateUI(); }\n' +
      'document.getElementById("btnAdmin").onclick = async () => { const r = await api("POST","/auth/dev/admin-token",{ email:"admin@example.com", name:"Admin" }); if(r.json&&r.json.token){ s.adminToken=r.json.token; setCookie("access_token", r.json.token); log({ admin:r.json.user }); updateUI(); } else { log(r) } }\n' +
      'document.getElementById("btnBuyer").onclick = async () => { const r = await api("POST","/auth/dev/participant-token",{ email:"buyer@example.com", name:"Buyer" }); if(r.json&&r.json.token){ s.buyerToken=r.json.token; log({ buyer:r.json.user }); updateUI(); await showOrders("after_login_buyer"); } else { log(r) } }\n' +
      'document.getElementById("btnCreatePaidEvent").onclick = async () => { const body={ title:"Evento Pago", description:"Evento com ticket pago.", startDate:new Date(Date.now()+86400000).toISOString(), endDate:new Date(Date.now()+90000000).toISOString(), location:"Auditório A", capacity:10 }; const r = await api("POST","/events",body,s.adminToken); log({ createPaidEvent:r }); if(r.json&&r.json.id){ s.eventIdPaid=r.json.id; s.eventNamePaid=r.json.title||""; setText("labelPaidTT", (s.eventNamePaid? ("Evento: "+s.eventNamePaid+" • "): "") + (s.ttNamePaid? ("TT: "+s.ttNamePaid): "")); updateUI(); } }\n' +
      'document.getElementById("btnCreatePaidTT").onclick = async () => { const body={ name:"Inteira", price:50, quantity:10 }; const r = await api("POST","/events/"+s.eventIdPaid+"/ticket-types",body,s.adminToken); log({ createPaidTT:r }); if(r.json&&r.json.id){ s.ttIdPaid=r.json.id; s.ttNamePaid=r.json.name; setText("labelPaidTT", (s.eventNamePaid? ("Evento: "+s.eventNamePaid+" • "): "") + (s.ttNamePaid? ("TT: "+s.ttNamePaid): "")); updateUI(); } }\n' +
      'document.getElementById("btnPublishPaid").onclick = async () => { const r = await api("POST","/events/"+s.eventIdPaid+"/publish",null,s.adminToken); log({ publishPaid:r }); }\n' +
      'document.getElementById("btnOrderPaid").onclick = async () => { const q = Number(document.getElementById("qtyPaid").value||"1"); const body={ eventId:s.eventIdPaid, items:[{ ticketTypeId:s.ttIdPaid, quantity:q }] }; const r = await api("POST","/orders/bulk",body,s.buyerToken); log({ orderPaid:r }); if(r.json&&r.json.order){ s.orderIdPaid=r.json.order.id; s.pricePaid=r.json.price; updateUI(); await showOrders("after_order_paid_bulk"); } }\n' +
      'document.getElementById("btnPayPaid").onclick = async () => { const r = await api("POST","/orders/"+s.orderIdPaid+"/pay",{ method:"CREDIT_CARD" },s.buyerToken); log({ payPaid:r }); await showOrders("after_pay_paid"); }\n' +
      'document.getElementById("btnCancelPaid").onclick = async () => { const r = await api("POST","/orders/"+s.orderIdPaid+"/cancel",null,s.buyerToken); log({ cancelPaid:r }); await showOrders("after_cancel_paid"); }\n' +
      'document.getElementById("btnRevertPaid").onclick = async () => { const r = await api("POST","/orders/"+s.orderIdPaid+"/revert-cancel",null,s.buyerToken); log({ revertPaid:r }); await showOrders("after_revert_paid"); }\n' +
      'document.getElementById("btnRefundPaid").onclick = async () => { const r = await api("POST","/orders/"+s.orderIdPaid+"/refund",null,s.buyerToken); log({ refundPaid:r }); await showOrders("after_refund_paid"); }\n' +
      'document.getElementById("btnCreateFreeEvent").onclick = async () => { const body={ title:"Evento Gratuito", description:"Evento com ticket gratuito.", startDate:new Date(Date.now()+86400000).toISOString(), endDate:new Date(Date.now()+90000000).toISOString(), location:"Auditório B", capacity:10 }; const r = await api("POST","/events",body,s.adminToken); log({ createFreeEvent:r }); if(r.json&&r.json.id){ s.eventIdFree=r.json.id; s.eventNameFree=r.json.title||""; setText("labelFreeTT", (s.eventNameFree? ("Evento: "+s.eventNameFree+" • "): "") + (s.ttNameFree? ("TT: "+s.ttNameFree): "")); updateUI(); } }\n' +
      'document.getElementById("btnCreateFreeTT").onclick = async () => { const body={ name:"Gratuito", price:0, quantity:10 }; const r = await api("POST","/events/"+s.eventIdFree+"/ticket-types",body,s.adminToken); log({ createFreeTT:r }); if(r.json&&r.json.id){ s.ttIdFree=r.json.id; s.ttNameFree=r.json.name; setText("labelFreeTT", (s.eventNameFree? ("Evento: "+s.eventNameFree+" • "): "") + (s.ttNameFree? ("TT: "+s.ttNameFree): "")); updateUI(); } }\n' +
      'document.getElementById("btnPublishFree").onclick = async () => { const r = await api("POST","/events/"+s.eventIdFree+"/publish",null,s.adminToken); log({ publishFree:r }); }\n' +
      'document.getElementById("btnOrderFree").onclick = async () => { const q = Number(document.getElementById("qtyFree").value||"1"); const body={ eventId:s.eventIdFree, items:[{ ticketTypeId:s.ttIdFree, quantity:q }] }; const r = await api("POST","/orders/bulk",body,s.buyerToken); log({ orderFree:r }); if(r.json&&r.json.order){ s.orderIdFree=r.json.order.id; updateUI(); } await showOrders("after_order_free_bulk"); }\n' +
      'document.getElementById("btnCancelFree").onclick = async () => { const r = await api("POST","/orders/"+s.orderIdFree+"/cancel",null,s.buyerToken); log({ cancelFree:r }); await showOrders("after_cancel_free"); }\n' +
      'document.getElementById("btnRefundFree").onclick = async () => { const r = await api("POST","/orders/"+s.orderIdFree+"/refund",null,s.buyerToken); log({ refundFree:r }); await showOrders("after_refund_free"); }\n' +
      'updateUI(); bootstrap();\n' +
      'document.getElementById("btnLocalRegister").onclick = async () => { const email = document.getElementById("localEmail").value || "organizer@example.com"; const name = document.getElementById("localName").value || "Organizer"; const password = document.getElementById("localPass").value || "Password123"; const r = await api("POST","/auth/local/register",{ email, name, password }); log({ localRegister:r }); }\n' +
      'document.getElementById("btnLocalLogin").onclick = async () => { const email = document.getElementById("localEmail").value || "organizer@example.com"; const password = document.getElementById("localPass").value || "Password123"; const r = await api("POST","/auth/local/login",{ email, password }); if(r.json&&r.json.token){ s.buyerToken=r.json.token; log({ localLogin:r }); updateUI(); await showOrders("after_local_login"); } else { log(r) } }\n' +
      '</script>' +
      '</body></html>'
    )
  } catch {
    return res.status(500).json({ error: 'success_failed' })
  }
})

router.post('/local/register', async (req: Request, res: Response) => {
  try {
    const { email, name, password } = localRegisterSchema.parse(req.body)
    const hasUpper = /[A-Z]/.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasDigit = /\d/.test(password)
    if (!(hasUpper && hasLower && hasDigit)) return res.status(400).json({ error: 'weak_password' })
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync(password, salt, 32).toString('hex')
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, role: Role.ORGANIZER, passwordHash: `${salt}:${hash}` },
      create: { email, name, role: Role.ORGANIZER, passwordHash: `${salt}:${hash}` }
    })
    return res.status(201).json({ id: user.id })
  } catch (e: any) {
    if (e?.errors) return res.status(400).json({ error: 'invalid_body', details: e.errors })
    const message = e?.code === 'P2002' ? 'email_exists' : 'local_register_failed'
    const status = e?.code === 'P2002' ? 409 : 500
    return res.status(status).json({ error: message })
  }
})

router.post('/local/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = localLoginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user?.passwordHash) return res.status(401).json({ error: 'invalid_credentials' })
    const [salt, stored] = String(user.passwordHash).split(':')
    const verify = scryptSync(password, salt, 32).toString('hex')
    if (verify !== stored) return res.status(401).json({ error: 'invalid_credentials' })
    const sid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
    await prisma.loginSession.create({ data: { userId: user.id, sessionId: sid, expiresAt } })
    const accessToken = signJwt({ sub: user.id, role: user.role, sid }, env.ACCESS_TOKEN_DAYS)
    const refreshToken = signJwt({ sub: user.id, type: 'refresh', sid }, env.REFRESH_TOKEN_DAYS)
    const isSecure = env.NODE_ENV !== 'development'
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: env.ACCESS_TOKEN_DAYS * 24 * 60 * 60 * 1000
    })
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
    })
    return res.json({ accessToken, refreshToken, user })
  } catch (e: any) {
    if (e?.errors) return res.status(400).json({ error: 'invalid_body', details: e.errors })
    return res.status(500).json({ error: 'local_login_failed' })
  }
})

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const cookieHeader = req.headers['cookie']
    const cookies = Object.fromEntries(
      (cookieHeader || '')
        .split(';')
        .map((s: string) => s.trim())
        .filter((s: string) => s.includes('='))
        .map((p: string) => {
          const i = p.indexOf('=')
          return [p.substring(0, i), decodeURIComponent(p.substring(i + 1))]
        })
    ) as Record<string, string>
    const refresh = cookies['refresh_token']
    let sid: string | undefined
    if (refresh) {
      try { const rp: any = jwt.verify(refresh, env.JWT_SECRET); sid = rp?.sid } catch {}
    }
    const access = cookies['access_token']
    if (!sid && access) {
      try { const ap: any = jwt.decode(access); sid = ap?.sid } catch {}
    }
    if (sid) {
      try {
        await prisma.loginSession.update({ where: { sessionId: sid }, data: { revokedAt: new Date() } })
        audit('logout', { sid })
      } catch {}
    }
    const isSecure = env.NODE_ENV !== 'development'
    res.clearCookie('access_token', { httpOnly: true, secure: isSecure, sameSite: 'lax' })
    res.clearCookie('refresh_token', { httpOnly: true, secure: isSecure, sameSite: 'lax' })
    return res.status(204).send()
  } catch {
    return res.status(500).json({ error: 'logout_failed' })
  }
})

router.post('/dev/admin-token', async (req: Request, res: Response) => {
  try {
    if (env.NODE_ENV !== 'development') return res.status(403).json({ error: 'forbidden' })
    const { email, name } = (req.body || {}) as { email?: string; name?: string }
    const e = email || 'admin@example.com'
    const n = name || 'Admin'
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync('dev-admin-password', salt, 32).toString('hex')
    const user = await prisma.user.upsert({
      where: { email: e },
      update: { name: n, role: Role.ADMIN, passwordHash: `${salt}:${hash}` },
      create: { email: e, name: n, role: Role.ADMIN, passwordHash: `${salt}:${hash}` }
    })
    const token = signJwt({ sub: user.id, role: user.role })
    return res.json({ token, user })
  } catch {
    return res.status(500).json({ error: 'dev_admin_token_failed' })
  }
})

router.post('/dev/participant-token', async (req: Request, res: Response) => {
  try {
    if (env.NODE_ENV !== 'development') return res.status(403).json({ error: 'forbidden' })
    const { email, name } = (req.body || {}) as { email?: string; name?: string }
    const e = email || 'organizer@example.com'
    const n = name || 'Organizer'
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync('dev-organizer-password', salt, 32).toString('hex')
    const user = await prisma.user.upsert({
      where: { email: e },
      update: { name: n, role: Role.ORGANIZER, passwordHash: `${salt}:${hash}` },
      create: { email: e, name: n, role: Role.ORGANIZER, passwordHash: `${salt}:${hash}` }
    })
    const token = signJwt({ sub: user.id, role: user.role })
    return res.json({ token, user })
  } catch {
    return res.status(500).json({ error: 'dev_participant_token_failed' })
  }
})

export default router
