import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const schema = z.object({
  athlete_id: z.string().min(1, 'Required'),
  place: z.string().optional(),
  result: z.string().max(50).optional(),
  is_pb: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  eventId: string;
  initialData?: any | null;
}

export default function EntryFormDialog({ open, onOpenChange, onSaved, eventId, initialData }: Props) {
  const isEdit = !!initialData;
  const [athletes, setAthletes] = useState<{ id: string; full_name: string; country_flag: string }[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { athlete_id: '', place: '', result: '', is_pb: false },
  });

  useEffect(() => {
    if (open) {
      supabase.from('athletes').select('id, full_name, country_flag').order('full_name').then(({ data }) => setAthletes(data || []));
      if (initialData) {
        form.reset({
          athlete_id: initialData.athlete_id,
          place: initialData.place?.toString() || '',
          result: initialData.result || '',
          is_pb: initialData.is_pb,
        });
      } else {
        form.reset({ athlete_id: '', place: '', result: '', is_pb: false });
      }
    }
  }, [open, initialData]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      athlete_id: values.athlete_id,
      event_id: eventId,
      place: values.place ? parseInt(values.place) : null,
      result: values.result || null,
      is_pb: values.is_pb,
    };
    const { error } = isEdit
      ? await supabase.from('event_entries').update(payload).eq('id', initialData!.id)
      : await supabase.from('event_entries').insert([payload] as any);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? 'Entry updated' : 'Entry added');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Entry' : 'Add Entry'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update the athlete entry.' : 'Add an athlete to this event.'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="athlete_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Athlete</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select athlete" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {athletes.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.country_flag} {a.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="place" render={({ field }) => (
                <FormItem><FormLabel>Place</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="result" render={({ field }) => (
                <FormItem><FormLabel>Result</FormLabel><FormControl><Input placeholder="10.24" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="is_pb" render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">Personal Best</FormLabel>
              </FormItem>
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
