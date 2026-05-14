import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Ticket, CreditCard, FileText, BarChart3, Settings, Plane } from 'lucide-react';

const NAV = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/customers',  label: 'Customers',  icon: Users },
  { to: '/tickets',    label: 'Tickets',    icon: Ticket },
  { to: '/payments',   label: 'Payments',   icon: CreditCard },
  { to: '/invoices',   label: 'Invoices',   icon: FileText },
  { to: '/reports',    label: 'Reports',    icon: BarChart3 },
  { to: '/settings',   label: 'Settings',   icon: Settings },
];

export function Sidebar({ mobile = false, onClose }) {
  return (
    <aside className={`${mobile ? 'w-full' : 'w-56 hidden lg:flex'} flex-col bg-gray-900 text-white h-full`}>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-700">
        <div className="bg-blue-600 rounded-xl p-2">
          <Plane size={20} className="text-white" />
        </div>
        <div className="leading-tight">
          <p className="font-bold text-sm">Ticket Manager</p>
          <p className="text-gray-400 text-xs">Expense System</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-gray-700 text-xs text-gray-500">
        Offline-first · v1.0
      </div>
    </aside>
  );
}
