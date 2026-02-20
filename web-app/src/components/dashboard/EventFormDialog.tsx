import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().trim().min(1, 'Required').max(200),
  gender: z.enum(['men', 'women', 'mixed']),
  round: z.string().max(100).optional(),
  status: z.enum(['scheduled', 'in_progress', 'complete']),
  sort_order: z.coerce.number().int().min(0).default(0),
  scheduled_time: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  meetId: string;
  initialData?: any | null;
}

export default function EventFormDialog({ open, onOpenChange, onSaved, meetId, initialData }: Props) {
  const isEdit = !!initialData;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', gender: 'men', round: '', status: 'scheduled', sort_order: 0, scheduled_time: '' },
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        name: initialData.name,
        gender: initialData.gender,
        round: initialData.round || '',
        status: initialData.status,
        sort_order: initialData.sort_order,
        scheduled_time: initialData.scheduled_time ? new Date(initialData.scheduled_time).toISOString().slice(0, 16) : '',
      });
    } else if (open) {
      form.reset({ name: '', gender: 'men', round: '', status: 'scheduled', sort_order: 0, scheduled_time: '' });
    }
  }, [open, initialData]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      gender: values.gender,
      round: values.round || null,
      status: values.status,
      sort_order: values.sort_order,
      scheduled_time: values.scheduled_time || null,
      meet_id: meetId,
    };
    const { error } = isEdit
      ? await supabase.from('events').update(payload).eq('id', initialData!.id)
      : await supabase.from('events').insert([payload] as any);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? 'Event updated' : 'Event created');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Event' : 'Add Event'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update the event details.' : 'Add a new event to this meet.'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Event Name</FormLabel><FormControl><Input placeholder="100m" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="men">Men</SelectItem><SelectItem value="women">Women</SelectItem><SelectItem value="mixed">Mixed</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="complete">Complete</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="round" render={({ field }) => (
                <FormItem><FormLabel>Round</FormLabel><FormControl><Input placeholder="Final, Heat 1..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="sort_order" render={({ field }) => (
                <FormItem><FormLabel>Sort Order</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="scheduled_time" render={({ field }) => (
              <FormItem><FormLabel>Scheduled Time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Add'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
