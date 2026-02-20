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
import type { Tables } from '@/integrations/supabase/types';

const schema = z.object({
  title: z.string().trim().min(1, 'Required').max(200),
  subtitle: z.string().max(300).optional(),
  image_url: z.string().max(500).optional(),
  cta_label: z.string().max(100).optional(),
  cta_url: z.string().max(500).optional(),
  placement: z.enum(['homepage', 'meet']),
  meet_id: z.string().optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initialData?: Tables<'banners'> | null;
}

export default function BannerFormDialog({ open, onOpenChange, onSaved, initialData }: Props) {
  const isEdit = !!initialData;
  const [meets, setMeets] = useState<{ id: string; name: string }[]>([]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', subtitle: '', image_url: '', cta_label: '', cta_url: '', placement: 'homepage', meet_id: '', is_active: false },
  });

  useEffect(() => {
    if (open) {
      supabase.from('meets').select('id, name').order('name').then(({ data }) => setMeets(data || []));
      if (initialData) {
        form.reset({
          title: initialData.title,
          subtitle: initialData.subtitle || '',
          image_url: initialData.image_url || '',
          cta_label: initialData.cta_label || '',
          cta_url: initialData.cta_url || '',
          placement: initialData.placement,
          meet_id: initialData.meet_id || '',
          is_active: initialData.is_active,
        });
      } else {
        form.reset();
      }
    }
  }, [open, initialData]);

  const placement = form.watch('placement');

  const onSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      subtitle: values.subtitle || null,
      image_url: values.image_url || null,
      cta_label: values.cta_label || null,
      cta_url: values.cta_url || null,
      placement: values.placement,
      meet_id: values.placement === 'meet' && values.meet_id ? values.meet_id : null,
      is_active: values.is_active,
    };
    const { error } = isEdit
      ? await supabase.from('banners').update(payload).eq('id', initialData!.id)
      : await supabase.from('banners').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? 'Banner updated' : 'Banner created');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Banner' : 'Create Banner'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update the banner details.' : 'Fill in the details to create a new banner.'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="subtitle" render={({ field }) => (
              <FormItem><FormLabel>Subtitle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="image_url" render={({ field }) => (
              <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="cta_label" render={({ field }) => (
                <FormItem><FormLabel>CTA Label</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="cta_url" render={({ field }) => (
                <FormItem><FormLabel>CTA URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="placement" render={({ field }) => (
                <FormItem><FormLabel>Placement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="homepage">Homepage</SelectItem><SelectItem value="meet">Meet</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
              {placement === 'meet' && (
                <FormField control={form.control} name="meet_id" render={({ field }) => (
                  <FormItem><FormLabel>Meet</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select meet" /></SelectTrigger></FormControl><SelectContent>{meets.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
              )}
            </div>
            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">Active</FormLabel>
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
