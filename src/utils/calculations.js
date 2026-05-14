import db from '../db/db';

export function fmt(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

export function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function daysBetween(dateStr) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function getTicketBalance(ticketId) {
  const payments = await db.payments.where('ticketId').equals(ticketId).toArray();
  const paid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  return paid;
}

export async function getCustomerSummary(customerId) {
  const tickets = await db.tickets.where('customerId').equals(customerId).toArray();
  const activeTickets = tickets.filter(t => t.status !== 'Cancelled');

  let totalCharged = 0, totalPaid = 0;
  for (const t of activeTickets) {
    totalCharged += t.amountCharged || 0;
    const paid = await getTicketBalance(t.id);
    totalPaid += paid;
  }

  return {
    totalCharged,
    totalPaid,
    totalOwed: totalCharged - totalPaid,
    ticketCount: activeTickets.length,
  };
}
