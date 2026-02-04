import { useState } from 'react'
import { fmtDate, fmtMoneyBRL } from '../../utils/format'
import { SevenEventsLogo } from '../common/SevenEventsLogo'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { QrCodePrintIcon } from '../common/QrCodePrintIcon'
import { QRCode } from 'react-qrcode-logo'

const LOGO_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="56" height="56" rx="16" fill="#0F172A" /><path d="M16 12 C 20 9.5, 24 8.5, 28 8.5" stroke="#38BDF8" strokeWidth="2.4" strokeLinecap="round" /><rect x="18" y="22" width="20" height="3.5" rx="1.75" fill="#38BDF8" /><rect x="18" y="30" width="18" height="3.5" rx="1.75" fill="#22C55E" /><rect x="18" y="38" width="14" height="3.5" rx="1.75" fill="#A5B4FC" /><path d="M30 18 H44 L36 44" fill="none" stroke="#F9FAFB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>`
const LOGO_URI = `data:image/svg+xml;base64,${btoa(LOGO_SVG)}`

export type TicketRowData = {
  id: string
  eventName: string
  eventImage?: string
  ticketTypeName: string
  price: number
  status: string
  purchaseDate: string
  code: string
  location?: string
  startDate?: string
}

function StatusBadge({ status }: { readonly status: string }) {
  let color = '#6b7280'
  let bg = '#f3f4f6'
  let label = status

  switch (status) {
    case 'ACTIVE':
    case 'PAID':
      color = '#166534'
      bg = '#dcfce7'
      label = 'Ativo'
      break
    case 'WAITING':
    case 'PENDING':
      color = '#d97706'
      bg = '#fef3c7'
      label = 'Pendente'
      break
    case 'USED':
      color = '#1f2937'
      bg = '#e5e7eb'
      label = 'Utilizado'
      break
    case 'CANCELED':
    case 'INVALID':
    case 'REFUNDED':
      color = '#b91c1c'
      bg = '#fee2e2'
      label = 'Cancelado'
      break
  }

  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      color,
      background: bg,
      textTransform: 'capitalize'
    }}>
      {label}
    </span>
  )
}

export default function TicketList({ tickets }: { readonly tickets: readonly TicketRowData[] }) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const selectedTicket = selectedTicketId ? tickets.find(t => t.id === selectedTicketId) || null : null

  const downloadPDF = async () => {
    const element = document.getElementById('ticket-content')
    if (!element) return
    try {
      await new Promise(resolve => setTimeout(resolve, 200))
      const canvas = await html2canvas(element, { 
        scale: 2, 
        backgroundColor: null, // Transparent to capture border radius nicely if needed, but usually white is safer for PDF
        useCORS: true,
        allowTaint: true
      })
      const imgData = canvas.toDataURL('image/png')
      // A4 landscape or custom size? Ticket size is usually smaller. 
      // Let's make the PDF size match the canvas size for a perfect "ticket" file.
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save(`ticket-${selectedTicket?.code || 'event'}.pdf`)
    } catch (err) {
      console.error('Failed to download PDF', err)
    }
  }

  if (!tickets || tickets.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray)' }}>Nenhum ingresso encontrado.</div>
  }

  return (
    <>
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px', minWidth: 600 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <th style={{ padding: '0 16px', fontWeight: 600 }}>Evento</th>
              <th style={{ padding: '0 16px', fontWeight: 600 }}>Ingresso</th>
              <th style={{ padding: '0 16px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '0 16px', fontWeight: 600 }}>Data Compra</th>
              <th style={{ padding: '0 16px', fontWeight: 600 }}>Valor</th>
              <th style={{ padding: '0 16px', fontWeight: 600 }}></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id} style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.1s' }}>
                <td style={{ padding: '16px', borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: '#e5e7eb',
                      backgroundImage: t.eventImage ? `url('${t.eventImage}')` : 'none',
                      backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0
                    }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{t.eventName}</span>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500, color: '#374151' }}>{t.ticketTypeName}</span>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <StatusBadge status={t.status} />
                </td>
                <td style={{ padding: '16px', color: '#4b5563' }}>
                  {fmtDate(t.purchaseDate)}
                </td>
                <td style={{ padding: '16px', fontWeight: 600, color: '#111827' }}>
                  {fmtMoneyBRL(t.price)}
                </td>
                <td style={{ padding: '16px', borderTopRightRadius: 12, borderBottomRightRadius: 12, textAlign: 'right' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (t.status !== 'WAITING' && t.status !== 'PENDING') {
                        setSelectedTicketId(t.id)
                      }
                    }}
                    title={['WAITING', 'PENDING'].includes(t.status) ? "Aguardando pagamento" : "Ver Ticket"}
                    disabled={['WAITING', 'PENDING'].includes(t.status)}
                    style={{
                      border: 'none', background: '#f3f4f6', 
                      cursor: ['WAITING', 'PENDING'].includes(t.status) ? 'not-allowed' : 'pointer', 
                      color: ['WAITING', 'PENDING'].includes(t.status) ? '#9ca3af' : '#374151',
                      width: 32, height: 32, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                      opacity: ['WAITING', 'PENDING'].includes(t.status) ? 0.5 : 1
                    }}
                  >
                    <QrCodePrintIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTicket && (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {/* Backdrop */}
          <button 
            type="button"
            aria-label="Fechar modal"
            onClick={() => setSelectedTicketId(null)}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              height: '100%'
            }}
          />

          {/* Content */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            background: 'transparent', 
            padding: 0, 
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            
            {/* TICKET LAYOUT FOR PDF */}
            <div id="ticket-content" style={{ 
              width: '800px', 
              height: '320px', 
              display: 'flex',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
            }}>
              {/* Left Side - Event Info */}
              <div style={{ 
                flex: 2, 
                background: '#0F172A', 
                color: 'white', 
                borderTopLeftRadius: 24, 
                borderBottomLeftRadius: 24,
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Background Accent */}
                <div style={{
                  position: 'absolute', top: -50, left: -50, width: 200, height: 200,
                  background: 'radial-gradient(circle, rgba(56,189,248,0.2) 0%, rgba(0,0,0,0) 70%)',
                  borderRadius: '50%'
                }} />

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                  <div>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: '#94A3B8', marginBottom: 8 }}>Seven Events</div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, lineHeight: 1.1 }}>{selectedTicket.eventName}</h1>
                  </div>
                  {/* Optional: Event Image if available, or just logo */}
                  <div style={{ opacity: 1 }}>
                    <div style={{ width: 80, height: 80, border: '2px solid rgba(255,255,255,0.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <SevenEventsLogo size={64} showText={false} />
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div style={{ display: 'flex', gap: 40, zIndex: 1 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>Data e Hora</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedTicket.startDate ? fmtDate(selectedTicket.startDate) : 'Data a definir'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>Local</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedTicket.location || 'Local a definir'}</div>
                  </div>
                </div>

                {/* Footer / Ticket Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, zIndex: 1 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>Tipo de Ingresso</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#38BDF8' }}>{selectedTicket.ticketTypeName}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                     <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>Valor</div>
                     <div style={{ fontSize: 18, fontWeight: 600 }}>{fmtMoneyBRL(selectedTicket.price)}</div>
                  </div>
                </div>
              </div>

              {/* Divider Section */}
              <div style={{ 
                width: 0, 
                position: 'relative', 
                borderLeft: '2px dashed #CBD5E1', 
                background: '#F8FAFC',
                marginTop: 16, marginBottom: 16
              }}>
                <div style={{ 
                  position: 'absolute', top: -16, left: -10, width: 20, height: 20, 
                  background: 'rgba(0,0,0,0.5)', borderRadius: '50%' 
                }} />
                 <div style={{ 
                  position: 'absolute', bottom: -16, left: -10, width: 20, height: 20, 
                  background: 'rgba(0,0,0,0.5)', borderRadius: '50%' 
                }} />
              </div>

              {/* Right Side - QR Code */}
              <div style={{ 
                flex: 1, 
                background: 'white', 
                borderTopRightRadius: 24, 
                borderBottomRightRadius: 24,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16
              }}>
                 <div style={{ 
                   padding: 8, 
                   background: 'white', 
                   borderRadius: 12,
                   boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
                 }}>
                   <QRCode 
                    value={selectedTicket.code} 
                    size={140}
                    logoImage={LOGO_URI}
                    logoWidth={40}
                    logoHeight={40}
                    logoOpacity={1}
                    removeQrCodeBehindLogo={true}
                    qrStyle="dots"
                    eyeRadius={8}
                    fgColor="#0F172A"
                  />
                 </div>
                 <div style={{ textAlign: 'center' }}>
                   <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>Código do Ingresso</div>
                   <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{selectedTicket.code}</div>
                 </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 16 }}>
              <button 
                onClick={downloadPDF}
                style={{ 
                  background: '#38BDF8', color: '#0F172A', border: 'none', 
                  padding: '12px 24px', borderRadius: 99, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 4px 12px rgba(56,189,248,0.4)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onFocus={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                onBlur={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span className="mi">download</span>
                {' '}Baixar PDF
              </button>
              <button 
                onClick={() => setSelectedTicketId(null)}
                style={{ 
                  background: 'white', color: '#0F172A', border: 'none', 
                  padding: '12px 24px', borderRadius: 99, fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
