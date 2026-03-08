import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface CheckoutErrorBannerProps {
  message?: string;
  onClose?:   () => void;
  onDismiss?: () => void;
  onRetry?:   () => void;
}

export const CheckoutErrorBanner: React.FC<CheckoutErrorBannerProps> = ({ message, onClose, onDismiss, onRetry }) => {
  if (!message) return null;

  const handleDismiss = onDismiss ?? onClose;

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-3.5 flex items-start gap-2.5">
      <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-[11px] text-red-300 leading-relaxed">{message}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-red-400 hover:text-red-300 text-[10px] font-medium transition-colors"
          >
            <RefreshCw size={10} />
            Réessayer
          </button>
        )}
        {handleDismiss && (
          <button onClick={handleDismiss} className="text-red-600 hover:text-red-400 text-xs transition-colors">✕</button>
        )}
      </div>
    </div>
  );
};
