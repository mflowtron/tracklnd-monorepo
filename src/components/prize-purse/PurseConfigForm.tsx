import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Tables } from '@/integrations/supabase/types';

const schema = z.object({
  ppv_ticket_price: z.coerce.number().min(0, 'Must be 0 or more'),
  ppv_purse_mode: z.enum(['static', 'percentage']),
  ppv_purse_static_amount: z.coerce.number().min(0).nullable(),
  ppv_purse_percentage: z.coerce.number().min(0).max(100).nullable(),
  places_paid: z.coerce.number().min(1).max(6),
  contributions_open_at: z.string().nullable(),
  contributions_close_at: z.string().nullable(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface PurseConfigFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  meetId: string;
  initialData: Tables<'prize_purse_configs'> | null;
}

export default function PurseConfigForm({ open, onOpenChange, onSaved, meetId, initialData }: PurseConfigFormProps) {
  const isEdit = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ppv_ticket_price: 5.99,
      ppv_purse_mode: 'static',
      ppv_purse_static_amount: 1.50,
      ppv_purse_percentage: null,
      places_paid: 3,
      contributions_open_at: null,
      contributions_close_at: null,
      is_active: true,
    },
  });

  const purseMode = form.watch('ppv_purse_mode');

  useEffect(() => {
    if (initialData) {
      const toLocalDatetime = (val: string | null) => {
        if (!val) return null;
        const d = new Date(val);
        // Format as YYYY-MM-DDTHH:mm for datetime-local input
        return d.toISOString().slice(0, 16);
      };
      form.reset({
        ppv_ticket_price: initialData.ppv_ticket_price,
        ppv_purse_mode: initialData.ppv_purse_mode as 'static' | 'percentage',
        ppv_purse_static_amount: initialData.ppv_purse_static_amount,
        ppv_purse_percentage: initialData.ppv_purse_percentage,
        places_paid: initialData.places_paid,
        contributions_open_at: toLocalDatetime(initialData.contributions_open_at),
        contributions_close_at: toLocalDatetime(initialData.contributions_close_at),
        is_active: initialData.is_active,
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      meet_id: meetId,
      ppv_ticket_price: values.ppv_ticket_price,
      ppv_purse_mode: values.ppv_purse_mode,
      ppv_purse_static_amount: values.ppv_purse_mode === 'static' ? values.ppv_purse_static_amount : null,
      ppv_purse_percentage: values.ppv_purse_mode === 'percentage' ? values.ppv_purse_percentage : null,
      places_paid: values.places_paid,
      contributions_open_at: values.contributions_open_at ? new Date(values.contributions_open_at).toISOString() : null,
      contributions_close_at: values.contributions_close_at ? new Date(values.contributions_close_at).toISOString() : null,
      is_active: values.is_active,
    };

    const { error } = isEdit
      ? await supabase.from('prize_purse_configs').update(payload).eq('id', initialData!.id)
      : await supabase.from('prize_purse_configs').insert([payload] as any);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isEdit ? 'Config updated' : 'Prize purse created');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Prize Purse Config' : 'Create Prize Purse'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="ppv_ticket_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>PPV Ticket Price ($)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="places_paid" render={({ field }) => (
                <FormItem>
                  <FormLabel>Places Paid</FormLabel>
                  <Select value={String(field.value)} onValueChange={v => field.onChange(Number(v))}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="ppv_purse_mode" render={({ field }) => (
              <FormItem>
                <FormLabel>PPV Purse Mode</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="static">Static Amount</SelectItem>
                    <SelectItem value="percentage">Percentage of Ticket</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {purseMode === 'static' ? (
              <FormField control={form.control} name="ppv_purse_static_amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Static Purse Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" value={field.value ?? ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : (
              <FormField control={form.control} name="ppv_purse_percentage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Purse Percentage (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" min="0" max="100" value={field.value ?? ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="contributions_open_at" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contributions Open</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" value={field.value ?? ''} onChange={e => field.onChange(e.target.value || null)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="contributions_close_at" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contributions Close</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" value={field.value ?? ''} onChange={e => field.onChange(e.target.value || null)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Active</FormLabel>
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
