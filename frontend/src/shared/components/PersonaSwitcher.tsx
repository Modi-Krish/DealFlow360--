import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { login, fetchMe } from '../../features/auth/services/authApi';
import { ShieldCheck, Store, Briefcase, ShoppingBag, Truck, Check, Loader2 } from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  roleTitle: string;
  email: string;
  password: string;
  targetRoute: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgLight: string;
}

const PERSONAS: Persona[] = [
  {
    id: 'admin',
    name: 'Admin User',
    roleTitle: 'Marketplace Admin',
    email: 'admin@dealflow360.com',
    password: 'admin123',
    targetRoute: '/admin/dashboard',
    icon: ShieldCheck,
    color: 'text-purple-600',
    bgLight: 'bg-purple-50 border-purple-200 text-purple-700',
  },
  {
    id: 'seller',
    name: 'Apex Global Hardware',
    roleTitle: 'Verified Seller',
    email: 'seller1@dealflow360.com',
    password: 'seller123',
    targetRoute: '/seller/bids',
    icon: Store,
    color: 'text-blue-600',
    bgLight: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  {
    id: 'seller_emp',
    name: 'Marcus Vance',
    roleTitle: "Seller's Employee",
    email: 'marcus@apex.com',
    password: 'seller123',
    targetRoute: '/seller/bids',
    icon: Briefcase,
    color: 'text-indigo-600',
    bgLight: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  },
  {
    id: 'buyer',
    name: 'Acme Procurement',
    roleTitle: 'Customer / Buyer',
    email: 'buyer@acmecorp.com',
    password: 'buyer123',
    targetRoute: '/marketplace',
    icon: ShoppingBag,
    color: 'text-emerald-600',
    bgLight: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  {
    id: 'warehouse',
    name: 'Apex Logistics Depot',
    roleTitle: "Seller's Warehouse",
    email: 'warehouse@apex.com',
    password: 'ops123',
    targetRoute: '/ops/warehouse',
    icon: Truck,
    color: 'text-amber-600',
    bgLight: 'bg-amber-50 border-amber-200 text-amber-700',
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
    <div className="bg-slate-900 text-slate-200 px-4 py-2 border-b border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3 shadow-md z-30 sticky top-0">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          Role Switcher
        </span>
        <span className="text-slate-400 hidden sm:inline">
          Switch active user to test the multi-seller marketplace & bidding loop:
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        {PERSONAS.map((p) => {
          const Icon = p.icon;
          const isActive = user?.email === p.email;
          const isPending = switchingId === p.id;

          return (
            <button
              key={p.id}
              onClick={() => handleSwitch(p)}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
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
              <span className="text-[10px] opacity-70 hidden md:inline">({p.name.split(' ')[0]})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
