import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, Phone, Mail, Trash2, ChevronRight } from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';

function CustomerForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    companyName: '', contactName: '', phone: '', email: '', address: '', notes: '', ...initial,
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Company Name *" value={form.companyName} onChange={set('companyName')} required placeholder="Acme Corp" />
        <Input label="Contact Name" value={form.contactName} onChange={set('contactName')} placeholder="John Doe" />
        <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" />
        <Input label="Email" value={form.email} onChange={set('email')} type="email" placeholder="contact@example.com" />
      </div>
      <Input label="Address" value={form.address} onChange={set('address')} placeholder="123 Main St, City, State" />
      <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Any additional notes..." />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancel</Button>
        <Button type="submit">Save Customer</Button>
      </div>
    </form>
  );
}

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { customers, loading, addCustomer, updateCustomer, deleteCustomer } = useCustomers(search);

  const handleAdd = async (data) => {
    await addCustomer(data);
    setAddOpen(false);
  };

  const handleEdit = async (data) => {
    await updateCustomer(editCustomer.id, data);
    setEditCustomer(null);
  };

  const handleDelete = async () => {
    await deleteCustomer(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{customers.length} total</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add Customer
        </Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by company, name, phone, email…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : customers.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center gap-3">
          <Building2 size={40} className="text-gray-300" />
          <p className="font-medium text-gray-500">{search ? 'No customers match your search' : 'No customers yet'}</p>
          {!search && <Button onClick={() => setAddOpen(true)}><Plus size={16} /> Add your first customer</Button>}
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-gray-100">
            {customers.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer group"
                onClick={() => navigate(`/customers/${c.id}`)}
              >
                <div className="bg-blue-100 rounded-xl p-2.5 shrink-0">
                  <Building2 size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{c.companyName}</p>
                  <p className="text-sm text-gray-500 truncate">{c.contactName}</p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-gray-400 shrink-0">
                  {c.phone && <span className="flex items-center gap-1"><Phone size={11} />{c.phone}</span>}
                  {c.email && <span className="flex items-center gap-1"><Mail size={11} />{c.email}</span>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); setEditCustomer(c); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteId(c.id); }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Customer">
        <CustomerForm onSave={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editCustomer} onClose={() => setEditCustomer(null)} title="Edit Customer">
        {editCustomer && <CustomerForm initial={editCustomer} onSave={handleEdit} onCancel={() => setEditCustomer(null)} />}
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Customer" size="sm">
        <p className="text-gray-600 mb-6">This will permanently delete this customer and all their tickets, payments, and invoices. This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
