import { useState, useCallback, useEffect } from 'react';
import { useSquarePayment } from '@/hooks/useSquarePayment';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

interface DirectContributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configId: string;
}

const CARD_CONTAINER_ID = 'contribution-card-container';

export default function DirectContributionModal({ open, onOpenChange, configId }: DirectContributionModalProps) {
  const { initializeCard, tokenizeAndPay, isLoading, error } = useSquarePayment();
  const [amount, setAmount] = useState('');
  const [eventAllocId, setEventAllocId] = useState<string>('');
  const [eventAllocations, setEventAllocations] = useState<(Tables<'event_purse_allocations'> & { events?: { name: string } })[]>([]);
  const [cardReady, setCardReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setCardReady(false);
      return;
    }
    // Load event allocations for the dropdown
    (async () => {
      const { data } = await supabase
        .from('event_purse_allocations')
        .select('*, events(name)')
        .eq('config_id', configId);
      setEventAllocations(data || []);
    })();

    // Initialize card form after DOM renders
    setTimeout(async () => {
      await initializeCard(CARD_CONTAINER_ID);
      setCardReady(true);
    }, 200);
  }, [open, configId, initializeCard]);

  const parsedAmount = parseFloat(amount);
  const isValidAmount = parsedAmount >= 2.0;

  const handleSubmit = async () => {
    if (!isValidAmount) {
      toast.error('Minimum contribution is $2.00');
      return;
    }

    const result = await tokenizeAndPay(
      configId,
      'direct',
      parsedAmount,
      eventAllocId || undefined,
    );

    if (result.success) {
      toast.success('Thank you for your contribution!');
      onOpenChange(false);
      setAmount('');
      setEventAllocId('');
    } else {
      toast.error(result.error || 'Payment failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[hsl(220,20%,10%)] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Contribute to Prize Purse</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/60 block mb-1.5">Amount ($)</label>
            <Input
              type="number"
              step="0.01"
              min="2"
              placeholder="2.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
            />
            {amount && !isValidAmount && (
              <p className="text-red-400 text-xs mt-1">Minimum contribution is $2.00</p>
            )}
          </div>

          <div>
            <label className="text-sm text-white/60 block mb-1.5">Direct to (optional)</label>
            <Select value={eventAllocId} onValueChange={setEventAllocId}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Overall Prize Purse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Overall Prize Purse</SelectItem>
                {eventAllocations.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {(a as any).events?.name || 'Event'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-white/60 block mb-1.5">Payment</label>
            <div
              id={CARD_CONTAINER_ID}
              className="bg-white/10 rounded-lg p-4 min-h-[80px]"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={isLoading || !cardReady || !isValidAmount}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
            ) : (
              `Contribute ${isValidAmount ? `$${parsedAmount.toFixed(2)}` : ''}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
