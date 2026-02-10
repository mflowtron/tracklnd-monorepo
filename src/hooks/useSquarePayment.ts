import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SQUARE_SANDBOX_URL = 'https://sandbox.web.squareup.com/v1/square.js';
const SQUARE_PROD_URL = 'https://web.squareup.com/v1/square.js';

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<any>;
    };
  }
}

function getSquareScriptUrl() {
  const env = import.meta.env.VITE_SQUARE_ENVIRONMENT;
  return env === 'production' ? SQUARE_PROD_URL : SQUARE_SANDBOX_URL;
}

function loadSquareScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Square) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src*="square.js"]`) as HTMLScriptElement | null;
    if (existing) {
      // If the script already finished loading, check immediately
      if (window.Square) {
        resolve();
        return;
      }
      // If the script tag exists but may have already finished (loaded or errored),
      // add a timeout fallback so we don't hang forever
      let settled = false;
      existing.addEventListener('load', () => { if (!settled) { settled = true; resolve(); } });
      existing.addEventListener('error', () => { if (!settled) { settled = true; reject(new Error('Failed to load Square SDK')); } });
      setTimeout(() => {
        if (!settled) {
          settled = true;
          if (window.Square) resolve();
          else reject(new Error('Square SDK load timed out'));
        }
      }, 5000);
      return;
    }
    const script = document.createElement('script');
    script.src = getSquareScriptUrl();
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Square SDK'));
    document.head.appendChild(script);
  });
}

export function useSquarePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<any>(null);
  const paymentsRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (cardRef.current) {
        try { cardRef.current.destroy(); } catch {}
        cardRef.current = null;
      }
    };
  }, []);

  const initializeCard = useCallback(async (containerId: string) => {
    setError(null);
    try {
      await loadSquareScript();

      const appId = import.meta.env.VITE_SQUARE_APPLICATION_ID;
      const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;

      if (!appId || !locationId) {
        throw new Error('Square Application ID and Location ID are required');
      }

      if (!paymentsRef.current) {
        paymentsRef.current = await window.Square!.payments(appId, locationId);
      }

      // Destroy previous card if any
      if (cardRef.current) {
        try { cardRef.current.destroy(); } catch {}
      }

      const card = await paymentsRef.current.card();
      await card.attach(`#${containerId}`);
      cardRef.current = card;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize payment form';
      setError(msg);
    }
  }, []);

  const tokenizeAndPay = useCallback(async (
    configId: string,
    paymentType: 'ppv' | 'direct',
    amount?: number,
    eventAllocationId?: string,
  ): Promise<{ success: boolean; paymentId?: string; error?: string }> => {
    if (!cardRef.current) {
      return { success: false, error: 'Payment form not initialized' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const tokenResult = await cardRef.current.tokenize();
      if (tokenResult.status !== 'OK') {
        throw new Error(tokenResult.errors?.[0]?.message || 'Card tokenization failed');
      }

      const { data, error: fnError } = await supabase.functions.invoke('process-square-payment', {
        body: {
          nonce: tokenResult.token,
          config_id: configId,
          payment_type: paymentType,
          event_allocation_id: eventAllocationId || undefined,
          amount: amount || undefined,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Payment processing failed');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Payment processing failed');
      }

      return { success: true, paymentId: data.payment_id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    initializeCard,
    tokenizeAndPay,
    isLoading,
    error,
  };
}
