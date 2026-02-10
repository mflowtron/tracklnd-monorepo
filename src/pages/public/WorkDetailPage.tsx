import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function WorkDetailPage() {
  const { slug } = useParams();
  const [work, setWork] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);

  useEffect(() => {
    if (!slug) return;
    supabase.from('works').select('*').eq('slug', slug).maybeSingle().then(({ data }) => {
      setWork(data);
      if (data?.author_id) {
        supabase.from('profiles').select('*').eq('id', data.author_id).maybeSingle().then(({ data: p }) => setAuthor(p));
      }
      if (data) {
        supabase.from('works').select('*').eq('status', 'published').neq('id', data.id).limit(3).then(({ data: r }) => setRelated(r || []));
      }
    });
  }, [slug]);

  if (!work) return <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">Loading...</div>;

  return (
    <div>
      {/* Hero cover image */}
      <div className="relative h-[50vh] min-h-[400px]">
        <img src={work.cover_image_url} alt={work.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-24 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="outline" className="capitalize">{work.work_type}</Badge>
          <span className="text-sm text-muted-foreground">
            {work.published_at && format(new Date(work.published_at), 'MMMM d, yyyy')}
          </span>
          {author && <span className="text-sm text-muted-foreground">by {author.display_name}</span>}
        </div>

        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl mb-6">{work.title}</h1>

        {work.summary && (
          <p className="text-xl text-muted-foreground leading-relaxed mb-8">{work.summary}</p>
        )}

        <div
          className="prose prose-lg max-w-none [&_a]:text-primary [&_img]:rounded-lg"
          dangerouslySetInnerHTML={{ __html: work.body }}
        />

        {work.tags && work.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-border">
            {work.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link to="/works" className="text-sm text-primary hover:underline flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Works
          </Link>
        </div>
      </div>

      {/* Related works */}
      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mt-8">
          <h2 className="font-display text-2xl mb-6">More Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {related.map(r => (
              <Link key={r.id} to={`/works/${r.slug}`} className="group">
                <div className="aspect-[4/3] rounded-lg overflow-hidden mb-3">
                  <img src={r.cover_image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <Badge variant="outline" className="text-xs capitalize mb-1">{r.work_type}</Badge>
                <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">{r.title}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
