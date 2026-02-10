import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import ImageUpload from '@/components/dashboard/ImageUpload';

const schema = z.object({
  name: z.string().trim().min(1, 'Required').max(200),
  slug: z.string().trim().min(1, 'Required').max(200).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  description: z.string().max(2000).default(''),
  venue: z.string().max(200).default(''),
  location: z.string().max(200).default(''),
  start_date: z.string().min(1, 'Required'),
  end_date: z.string().optional(),
  status: z.enum(['draft', 'upcoming', 'live', 'archived']),
  hero_image_url: z.string().max(500).optional(),
  broadcast_partner: z.string().max(200).optional(),
  broadcast_url: z.string().max(500).optional(),
  cta_label: z.string().max(100).optional(),
  cta_url: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initialData?: Tables<'meets'> | null;
}

export default function MeetFormDialog({ open, onOpenChange, onSaved, initialData }: Props) {
  const isEdit = !!initialData;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', slug: '', description: '', venue: '', location: '',
      start_date: '', end_date: '', status: 'draft', hero_image_url: '',
      broadcast_partner: '', broadcast_url: '', cta_label: '', cta_url: '',
    },
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        name: initialData.name,
        slug: initialData.slug,
        description: initialData.description || '',
        venue: initialData.venue || '',
        location: initialData.location || '',
        start_date: initialData.start_date,
        end_date: initialData.end_date || '',
        status: initialData.status,
        hero_image_url: initialData.hero_image_url || '',
        broadcast_partner: initialData.broadcast_partner || '',
        broadcast_url: initialData.broadcast_url || '',
        cta_label: initialData.cta_label || '',
        cta_url: initialData.cta_url || '',
      });
    } else if (open) {
      form.reset();
    }
  }, [open, initialData]);

  const nameValue = form.watch('name');
  useEffect(() => {
    if (!isEdit && nameValue) {
      form.setValue('slug', nameValue.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), { shouldValidate: true });
    }
  }, [nameValue, isEdit]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      end_date: values.end_date || null,
      hero_image_url: values.hero_image_url || null,
      broadcast_partner: values.broadcast_partner || null,
      broadcast_url: values.broadcast_url || null,
      cta_label: values.cta_label || null,
      cta_url: values.cta_url || null,
    };
    const { error } = isEdit
      ? await supabase.from('meets').update(payload).eq('id', initialData!.id)
      : await supabase.from('meets').insert([payload] as any);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? 'Meet updated' : 'Meet created');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Meet' : 'Create Meet'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update the meet details below.' : 'Fill in the details to create a new meet.'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="slug" render={({ field }) => (
                <FormItem><FormLabel>Slug</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="venue" render={({ field }) => (
                <FormItem><FormLabel>Venue</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="start_date" render={({ field }) => (
                <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="end_date" render={({ field }) => (
                <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="live">Live</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="hero_image_url" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <ImageUpload bucket="meet-images" value={field.value || ''} onChange={field.onChange} label="Hero Image" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="broadcast_partner" render={({ field }) => (
                <FormItem><FormLabel>Broadcast Partner</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="broadcast_url" render={({ field }) => (
                <FormItem><FormLabel>Broadcast URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="cta_label" render={({ field }) => (
                <FormItem><FormLabel>CTA Label</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="cta_url" render={({ field }) => (
                <FormItem><FormLabel>CTA URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
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
