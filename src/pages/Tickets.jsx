import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Ticket, ChevronRight, Trash2 } from 'lucide-react';
import { useTickets } from '../hooks/useTickets';
import { useCustomers } from '../hooks/useCustomers';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { fmt, fmtDate } from '../utils/calculations';

const STATUSES = ['Booked', 'Paid', 'Cancelled', 'Pending'];

export function TicketForm({ initial = {}, onSave, onCancel, defaultCustomerId }) {
  const { allCustomers } = useCustomers();
  const [form, setForm] = useState({
    customerId: defaultCustomerId || '',
    passengerName: '', airline: '', flightNumber: '', ticketNumber: '',
    amountCharged: '', internalCost: '', bookingDate: new Date().toISOString().slice(0, 10),
    status: 'Booked', notes: '', tags: '',
    ...initial,
    tags: Array.isArray(initial.tags) ? initial.tags.join(', ') : (initial.tags || ''),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      amountCharged: parseFloat(form.amountCharged) || 0,
      internalCost: parseFloat(form.internalCost) || 0,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!defaultCustomerId && (
        <Select label="Customer *" value={form.customerId} onChange={set('customerId')} required>
          <option value="">Select customer…</option>
          {allCustomers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
        </Select>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Passenger Name *" value={form.passengerName} onChange={set('passengerName')} required placeholder="John Doe" />
        <Input label="Airline" value={form.airline} onChange={set('airline')} placeholder="Emirates" />
        <Input label="Flight Number" value={form.flightNumber} onChange={set('flightNumber')} placeholder="EK 123" />
        <Input label="Ticket Number" value={form.ticketNumber} onChange={set('ticketNumber')} placeholder="176-1234567890" />
        <Input label="Amount Charged ($)" value={form.amountCharged} onChange={set('amountCharged')} type="number" step="0.01" min="0" placeholder="0.00" />
        <Input label="Internal Cost ($)" value={form.internalCost} onChange={set('internalCost')} type="number" step="0.01" min="0" placeholder="0.00" />
        <Input label="Booking Date" value={form.bookingDate} onChange={set('bookingDate')} type="date" />
        <Select label="Status" value={form.status} onChange={set('status')}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <Input label="Tags (comma separated)" value={form.tags} onChange={set('tags')} placeholder="business, international, refundable" />
      <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Any notes about this ticket…" />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancel</Button>
        <Button type="submit">Save Ticket</Button>
      </div>
    </form>
  );
}

export default function Tickets() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editTicket, setEditTicket] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { tickets, loading, addTicket, updateTicket, deleteTicket } = useTickets({ searchQuery: search });
  const { allCustomers } = useCustomers();

  const customerMap = Object.fromEntries(allCustomers.map(c => [c.id, c]));

  const filtered = statusFilter ? tickets.filter(t => t.status === statusFilter) : tickets;

  const handleAdd = async (data) => { await addTicket(data); setAddOpen(false); };
  const handleEdit = async (data) => { await updateTicket(editTicket.id, data); setEditTicket(null); };
  const handleDelete = async () => { await deleteTicket(deleteId); setDeleteId(null); };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} tickets</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus size={16} /> Add Ticket</Button>
      </div>

      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search passenger, ticket #, airline…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center gap-3">
          <Ticket size={40} className="text-gray-300" />
          <p className="font-medium text-gray-500">No tickets found</p>
          {!search && !statusFilter && <Button onClick={() => setAddOpen(true)}><Plus size={16} /> Add your first ticket</Button>}
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-gray-100">
            {filtered.map(t => {
              const cust = customerMap[t.customerId];
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer group"
                  onClick={() => navigate(`/tickets/${t.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{t.passengerName}</p>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {cust ? cust.companyName : '—'} · {t.airline} {t.flightNumber} · #{t.ticketNumber} · {fmtDate(t.bookingDate)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900">{fmt(t.amountCharged)}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); setEditTicket(t); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteId(t.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Ticket" size="lg">
        <TicketForm onSave={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editTicket} onClose={() => setEditTicket(null)} title="Edit Ticket" size="lg">
        {editTicket && <TicketForm initial={editTicket} onSave={handleEdit} onCancel={() => setEditTicket(null)} />}
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Ticket" size="sm">
        <p className="text-gray-600 mb-6">Delete this ticket and all its payments? This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
