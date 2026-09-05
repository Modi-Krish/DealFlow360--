import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { login, fetchMe } from '../../features/auth/services/authApi';
import { ShieldCheck, Store, Briefcase, ShoppingBag, Truck, Check, Loader2, DollarSign, CheckCircle2 } from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  roleTitle: string;
  role: string;
  email: string;
  password: string;
  targetRoute: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgLight: string;
}

const PERSONAS: Persona[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    roleTitle: 'Super Admin',
    role: 'super_admin',
    email: 'admin@dealflow360.com',
    password: 'admin123',
    targetRoute: '/admin/dashboard',
    icon: ShieldCheck,
    color: 'text-purple-400',
    bgLight: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  {
    id: 'seller_a',
    name: 'Apex Global',
    roleTitle: 'Seller A',
    role: 'seller',
    email: 'seller1@dealflow360.com',
    password: 'seller123',
    targetRoute: '/admin/dashboard',
    icon: Store,
    color: 'text-blue-400',
    bgLight: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  {
    id: 'manager_a',
    name: 'Sarah Manager',
    roleTitle: 'Sales Manager',
    role: 'sales_manager',
    email: 'manager@apex.com',
    password: 'seller123',
    targetRoute: '/sales/approvals',
    icon: CheckCircle2,
    color: 'text-pink-400',
    bgLight: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  },
  {
    id: 'sales_rep_a',
    name: 'Marcus Vance',
    roleTitle: 'Sales Rep A',
    role: 'sales_rep',
    email: 'marcus@apex.com',
    password: 'seller123',
    targetRoute: '/sales/quotations',
    icon: Briefcase,
    color: 'text-indigo-400',
    bgLight: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  {
    id: 'finance_a',
    name: 'Fiona Finance',
    roleTitle: 'Finance A',
    role: 'finance',
    email: 'finance@apex.com',
    password: 'seller123',
    targetRoute: '/ops/dashboard',
    icon: DollarSign,
    color: 'text-emerald-400',
    bgLight: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'ops_a',
    name: 'Logistics Hub',
    roleTitle: 'Operations A',
    role: 'operations',
    email: 'warehouse@apex.com',
    password: 'ops123',
    targetRoute: '/ops/warehouse',
    icon: Truck,
    color: 'text-amber-400',
    bgLight: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    id: 'seller_b',
    name: 'CloudScale Tech',
    roleTitle: 'Seller B',
    role: 'seller',
    email: 'seller2@dealflow360.com',
    password: 'seller123',
    targetRoute: '/admin/dashboard',
    icon: Store,
    color: 'text-cyan-400',
    bgLight: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  {
    id: 'buyer',
    name: 'Acme Procurement',
    roleTitle: 'Customer',
    role: 'customer',
    email: 'buyer@acmecorp.com',
    password: 'buyer123',
    targetRoute: '/marketplace',
    icon: ShoppingBag,
    color: 'text-teal-400',
    bgLight: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },
];

export const PersonaSwitcher: React.FC = () => {
  const { user, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const handleSwitch = async (persona: Persona) => {
    if (user?.email === persona.email) {
      navigate(persona.targetRoute);
      return;
    }

    setSwitchingId(persona.id);
    try {
      const loginRes = await login({ email: persona.email, password: persona.password });
      if (loginRes.success && loginRes.data?.access_token) {
        localStorage.setItem('access_token', loginRes.data.access_token);
        const meRes = await fetchMe();
        if (meRes.success) {
          setAuth(meRes.data, loginRes.data.access_token);
          navigate(persona.targetRoute);
        }
      }
    } catch (err) {
      console.error('Failed to switch persona:', err);
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-200 px-4 py-2 border-b border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2 shadow-md z-30 sticky top-0">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider">
          RBAC Role Switcher
        </span>
        <span className="text-slate-400 text-xs hidden lg:inline">
          Switch role to test tenant isolation & granular permissions:
        </span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
        {PERSONAS.map((p) => {
          const Icon = p.icon;
          const isActive = user?.email === p.email;
          const isPending = switchingId === p.id;

          return (
            <button
              key={p.id}
              onClick={() => handleSwitch(p)}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${
                isActive
                  ? 'bg-primary text-slate-950 font-bold border-primary shadow-sm ring-1 ring-primary/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isActive ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                <Icon className={`w-3.5 h-3.5 ${p.color}`} />
              )}
              <span>{p.roleTitle}</span>
              <span className="text-[10px] opacity-60 hidden md:inline">({p.name.split(' ')[0]})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
