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
  title: z.string().trim().min(1, 'Required').max(300),
  slug: z.string().trim().min(1, 'Required').max(300).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  work_type: z.enum(['short', 'work', 'feature']),
  status: z.enum(['draft', 'published', 'archived']),
  summary: z.string().max(1000).default(''),
  body: z.string().default(''),
  cover_image_url: z.string().max(500).default(''),
  tags: z.string().max(500).default(''),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initialData?: Tables<'works'> | null;
}

export default function WorkFormDialog({ open, onOpenChange, onSaved, initialData }: Props) {
  const isEdit = !!initialData;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', slug: '', work_type: 'work', status: 'draft', summary: '', body: '', cover_image_url: '', tags: '' },
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        title: initialData.title,
        slug: initialData.slug,
        work_type: initialData.work_type,
        status: initialData.status,
        summary: initialData.summary || '',
        body: initialData.body || '',
        cover_image_url: initialData.cover_image_url || '',
        tags: initialData.tags?.join(', ') || '',
      });
    } else if (open) {
      form.reset();
    }
  }, [open, initialData]);

  const titleValue = form.watch('title');
  useEffect(() => {
    if (!isEdit && titleValue) {
      form.setValue('slug', titleValue.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), { shouldValidate: true });
    }
  }, [titleValue, isEdit]);

  const onSubmit = async (values: FormValues) => {
    const tagsArray = values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const isPublishing = values.status === 'published' && initialData?.status !== 'published';
    const payload: any = {
      title: values.title,
      slug: values.slug,
      work_type: values.work_type,
      status: values.status,
      summary: values.summary,
      body: values.body,
      cover_image_url: values.cover_image_url,
      tags: tagsArray,
    };
    if (isPublishing) payload.published_at = new Date().toISOString();

    const { error } = isEdit
      ? await supabase.from('works').update(payload).eq('id', initialData!.id)
      : await supabase.from('works').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? 'Work updated' : 'Work created');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Work' : 'Create Work'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update the content details.' : 'Fill in the details to create new content.'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="slug" render={({ field }) => (
                <FormItem><FormLabel>Slug</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="work_type" render={({ field }) => (
                <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="short">Short</SelectItem><SelectItem value="work">Work</SelectItem><SelectItem value="feature">Feature</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="summary" render={({ field }) => (
              <FormItem><FormLabel>Summary</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="body" render={({ field }) => (
              <FormItem><FormLabel>Body</FormLabel><FormControl><Textarea {...field} rows={6} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="cover_image_url" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <ImageUpload bucket="work-images" value={field.value || ''} onChange={field.onChange} label="Cover Image" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tags" render={({ field }) => (
              <FormItem><FormLabel>Tags (comma-separated)</FormLabel><FormControl><Input {...field} placeholder="track, portland, recap" /></FormControl><FormMessage /></FormItem>
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
