import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

const schema = z.object({
  full_name: z.string().trim().min(1, 'Required').max(200),
  team: z.string().max(200).optional(),
  country_code: z.string().min(2, 'Required').max(3).default('US'),
  country_flag: z.string().max(10).default('🇺🇸'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initialData?: Tables<'athletes'> | null;
}

export default function AthleteFormDialog({ open, onOpenChange, onSaved, initialData }: Props) {
  const isEdit = !!initialData;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', team: '', country_code: 'US', country_flag: '🇺🇸' },
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        full_name: initialData.full_name,
        team: initialData.team || '',
        country_code: initialData.country_code,
        country_flag: initialData.country_flag,
      });
    } else if (open) {
      form.reset({ full_name: '', team: '', country_code: 'US', country_flag: '🇺🇸' });
    }
  }, [open, initialData]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      full_name: values.full_name,
      team: values.team || null,
      country_code: values.country_code,
      country_flag: values.country_flag,
    };
    const { error } = isEdit
      ? await supabase.from('athletes').update(payload).eq('id', initialData!.id)
      : await supabase.from('athletes').insert([payload] as any);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? 'Athlete updated' : 'Athlete created');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Athlete' : 'Add Athlete'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update the athlete details.' : 'Add a new athlete to the database.'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="team" render={({ field }) => (
              <FormItem><FormLabel>Team / Club</FormLabel><FormControl><Input placeholder="Portland TC" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="country_code" render={({ field }) => (
                <FormItem><FormLabel>Country Code</FormLabel><FormControl><Input placeholder="US" maxLength={3} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="country_flag" render={({ field }) => (
                <FormItem><FormLabel>Flag Emoji</FormLabel><FormControl><Input placeholder="🇺🇸" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
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
