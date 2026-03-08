import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import type { SubscriptionPlan } from '../types';

const IS_DEV = import.meta.env?.DEV === true;

export const DevPlanSwitcher: React.FC = () => {
  const { compteActif, changerPlan } = useAuthStore();

  if (!IS_DEV || !compteActif) return null;

  const plans: SubscriptionPlan[] = ['free', 'pro', 'platinum'];
  const current = compteActif.subscription;

  return (
    <div className="rounded-2xl border border-orange-500/20 bg-orange-950/10 p-4 flex flex-col gap-2">
      <p className="text-[10px] text-orange-400 uppercase tracking-wider font-bold">Dev — Changer de plan</p>
      <div className="flex gap-2">
        {plans.map((plan) => (
          <button
            key={plan}
            onClick={() => changerPlan(plan)}
            className={[
              'flex-1 py-1.5 rounded-xl text-xs font-bold uppercase transition-all',
              current === plan
                ? 'bg-orange-600 text-white'
                : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300',
            ].join(' ')}
          >
            {plan}
          </button>
        ))}
      </div>
    </div>
  );
};
