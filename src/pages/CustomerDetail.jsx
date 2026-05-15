import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Phone, Mail, MapPin, Plus, FileText } from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import { useTickets } from '../hooks/useTickets';
import { useInvoices } from '../hooks/useInvoices';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Card, StatCard } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { fmt, fmtDate } from '../utils/calculations';
import { TicketForm } from './Tickets';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCustomer } = useCustomers();
  const { tickets, loading: ticketsLoading, addTicket } = useTickets({ customerId: id });
  const { invoices, createInvoice } = useInvoices(id);
  const [customer, setCustomer] = useState(null);
  const [addTicketOpen, setAddTicketOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [invoiceNotes, setInvoiceNotes] = useState('');

  useEffect(() => {
    getCustomer(id).then(c => { if (!c) navigate('/customers'); else setCustomer(c); });
  }, [id]);

  const activeTickets = tickets.filter(t => t.status !== 'Cancelled');
  const totalCharged = activeTickets.reduce((s, t) => s + (t.amountCharged || 0), 0);
  const totalPaid = activeTickets.reduce((s, t) => s + (t.amountPaid || 0), 0);
  const totalOwed = totalCharged - totalPaid;

  const handleAddTicket = async (data) => { await addTicket({ ...data, customerId: id }); setAddTicketOpen(false); };

  const handleCreateInvoice = async () => {
    if (!selectedTickets.length) return;
    await createInvoice({ customerId: id, ticketIds: selectedTickets, notes: invoiceNotes });
    setInvoiceOpen(false); setSelectedTickets([]); setInvoiceNotes('');
  };

  if (!customer) return <div className="text-center py-16 text-gray-400">Loading…</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customers')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{customer.companyName}</h1>
          {customer.contactName && <p className="text-sm text-gray-500">{customer.contactName}</p>}
        </div>
        <Button onClick={() => setInvoiceOpen(true)} variant="secondary"><FileText size={16} /> Generate Invoice</Button>
        <Button onClick={() => setAddTicketOpen(true)}><Plus size={16} /> Add Ticket</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Charged" value={fmt(totalCharged)} color="blue" />
        <StatCard label="Total Paid" value={fmt(totalPaid)} color="green" />
        <StatCard label="Balance Owed" value={fmt(totalOwed)} color={totalOwed > 0 ? 'red' : 'green'} />
        <StatCard label="Tickets" value={tickets.length} color="purple" />
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Contact Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {customer.phone && <div className="flex items-center gap-2 text-gray-600"><Phone size={15} className="text-gray-400" />{customer.phone}</div>}
          {customer.email && <div className="flex items-center gap-2 text-gray-600"><Mail size={15} className="text-gray-400" />{customer.email}</div>}
          {customer.address && <div className="flex items-center gap-2 text-gray-600 sm:col-span-2"><MapPin size={15} className="text-gray-400" />{customer.address}</div>}
          {customer.notes && <div className="sm:col-span-2 text-gray-500 italic border-t pt-3 mt-1">{customer.notes}</div>}
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Tickets</h3>
          <span className="text-sm text-gray-400">{tickets.length} tickets</span>
        </div>
        {ticketsLoading ? <div className="py-8 text-center text-gray-400 text-sm">Loading…</div> :
          tickets.length === 0 ? <div className="py-12 text-center text-gray-400">No tickets yet</div> : (
            <div className="divide-y divide-gray-100">
              {tickets.map(t => {
                const remaining = (t.amountCharged || 0) - (t.amountPaid || 0);
                return (
                  <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 text-sm">{t.passengerName}</p>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{t.airline} {t.flightNumber} · #{t.ticketNumber} · {fmtDate(t.bookingDate)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900 text-sm">{fmt(t.amountCharged)}</p>
                      {remaining > 0 ? <p className="text-xs text-red-500">Owes {fmt(remaining)}</p> : <p className="text-xs text-green-600">Paid</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
      </Card>

      {invoices.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Invoices</h3></div>
          <div className="divide-y divide-gray-100">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-4">
                <FileText size={16} className="text-gray-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-400">{fmtDate(inv.generatedAt)} · {inv.ticketIds?.length || 0} tickets</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={addTicketOpen} onClose={() => setAddTicketOpen(false)} title="Add Ticket" size="lg">
        <TicketForm onSave={handleAddTicket} onCancel={() => setAddTicketOpen(false)} defaultCustomerId={id} />
      </Modal>

      <Modal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} title="Generate Invoice">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">Select tickets to include:</p>
          <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
            {tickets.map(t => (
              <label key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedTickets.includes(t.id)}
                  onChange={e => setSelectedTickets(prev => e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id))}
                  className="rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{t.passengerName}</p>
                  <p className="text-xs text-gray-400">#{t.ticketNumber} · {fmt(t.amountCharged)}</p>
                </div>
                <StatusBadge status={t.status} />
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea rows={2} value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional notes…" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setInvoiceOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateInvoice} disabled={!selectedTickets.length}><FileText size={16} /> Generate & Download PDF</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
