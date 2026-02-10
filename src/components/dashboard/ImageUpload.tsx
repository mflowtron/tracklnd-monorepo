import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  bucket: string;
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ bucket, value, onChange, label = 'Image' }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    onChange(urlData.publicUrl);
    setUploading(false);
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {value ? (
        <div className="relative group rounded-lg overflow-hidden border bg-muted">
          <img src={value} alt="Preview" className="w-full h-40 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Replace
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => onChange('')}>
              <X className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <span className="text-sm">Click to upload</span>
            </>
          )}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      <Input
        placeholder="Or paste an image URL"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-xs"
      />
    </div>
  );
}
