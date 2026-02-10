import { useEffect, useCallback, useState } from 'react';
import { usePursePolling } from '@/hooks/usePursePolling';
import { useSquarePayment } from '@/hooks/useSquarePayment';
import AnimatedPurseAmount from './AnimatedPurseAmount';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

interface PPVPurchaseGateProps {
  meet: { name: string; venue: string };
  config: Tables<'prize_purse_configs'>;
  onAccessGranted: () => void;
}

const CARD_CONTAINER_ID = 'ppv-card-container';

export default function PPVPurchaseGate({ meet, config, onAccessGranted }: PPVPurchaseGateProps) {
  const { meetTotal } = usePursePolling(config.id);
  const { initializeCard, tokenizeAndPay, isLoading, error } = useSquarePayment();
  const [showCard, setShowCard] = useState(false);
  const [cardReady, setCardReady] = useState(false);

  const handleShowCard = useCallback(async () => {
    setShowCard(true);
    // Wait for DOM element to exist
    setTimeout(async () => {
      await initializeCard(CARD_CONTAINER_ID);
      setCardReady(true);
    }, 100);
  }, [initializeCard]);

  const handlePay = async () => {
    const result = await tokenizeAndPay(config.id, 'ppv');
    if (result.success) {
      toast.success('Purchase successful! Loading stream...');
      onAccessGranted();
    } else {
      toast.error(result.error || 'Payment failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
      <Lock className="h-12 w-12 text-white/20 mb-6" />
      <h2 className="text-2xl font-bold text-white mb-2">{meet.name}</h2>
      <p className="text-white/50 text-sm mb-6">Pay-per-view broadcast from {meet.venue}</p>

      {/* Live purse total */}
      <div className="mb-8">
        <p className="text-xs text-amber-400/60 tracking-widest font-display mb-1">PRIZE PURSE</p>
        <AnimatedPurseAmount value={meetTotal} className="text-2xl font-bold text-amber-400" />
        <p className="text-xs text-white/30 mt-1">Your ticket helps fund the prize purse</p>
      </div>

      {!showCard ? (
        <Button
          onClick={handleShowCard}
          size="lg"
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
        >
          Watch Live — ${config.ppv_ticket_price.toFixed(2)}
        </Button>
      ) : (
        <div className="w-full max-w-sm space-y-4">
          <div
            id={CARD_CONTAINER_ID}
            className="bg-white/10 rounded-lg p-4 min-h-[80px]"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button
            onClick={handlePay}
            disabled={isLoading || !cardReady}
            size="lg"
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
            ) : (
              `Pay $${config.ppv_ticket_price.toFixed(2)}`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
