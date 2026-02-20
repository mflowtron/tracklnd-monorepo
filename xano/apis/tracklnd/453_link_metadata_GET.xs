// Fetch link preview metadata for Editor.js LinkTool (admin only)
query "link/metadata" verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    // Target URL to fetch metadata for
    text url filters=trim
  }

  stack {
    // Verify admin role
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can fetch link metadata"
    }
  
    precondition ($input.url|starts_with:"http://" || $input.url|starts_with:"https://") {
      error_type = "inputerror"
      error = "url must start with http:// or https://"
    }
  
    // Fetch HTML. Note: api.request response shape can vary across Xano environments.
    api.request {
      url = $input.url
      method = "GET"
      headers = []
        |push:"User-Agent: TracklndLinkPreview/1.0"
        |push:"Accept: text/html,*/*"
      timeout = 15
    } as $fetch_response
  
    // Parse HTML + extract OpenGraph/metadata via sandboxed JS.
    api.lambda {
      code = """
          const requestedUrl = String($input.url || '').trim();
          const r = $fetch_response;
        
          const html =
            (typeof r === 'string' ? r : null)
            ?? (typeof r?.body === 'string' ? r.body : null)
            ?? (typeof r?.response?.body === 'string' ? r.response.body : null)
            ?? (typeof r?.response?.result === 'string' ? r.response.result : null)
            ?? (typeof r?.response?.result === 'object' ? JSON.stringify(r.response.result) : null)
            ?? (typeof r === 'object' ? JSON.stringify(r) : '')
            ?? '';
        
          const safeHtml = String(html || '');
          const head = safeHtml.slice(0, 200000);
        
          const getMeta = (attrName, attrValue) => {
            const re = new RegExp(`<meta[^>]+${attrName}=["']${attrValue.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}["'][^>]*>`, 'i');
            const m = head.match(re);
            if (!m) return '';
            const tag = m[0];
            const cm = tag.match(/content=["']([^"']+)["']/i);
            return (cm && cm[1]) ? cm[1].trim() : '';
          };
        
          const getTitle = () => {
            const og = getMeta('property', 'og:title') || getMeta('name', 'og:title');
            if (og) return og;
            const tm = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            return tm ? tm[1].trim().replace(/\s+/g, ' ') : '';
          };
        
          const getDescription = () => {
            return (
              getMeta('property', 'og:description')
              || getMeta('name', 'description')
              || getMeta('name', 'og:description')
            ).trim();
          };
        
          const getSiteName = () => {
            return (
              getMeta('property', 'og:site_name')
              || getMeta('name', 'og:site_name')
            ).trim();
          };
        
          const resolveUrl = (value) => {
            const v = String(value || '').trim();
            if (!v) return '';
            try {
              return new URL(v, requestedUrl).toString();
            } catch {
              return v;
            }
          };
        
          const image = resolveUrl(getMeta('property', 'og:image') || getMeta('name', 'og:image'));
          const title = getTitle();
          const description = getDescription();
          const siteName = getSiteName();
        
          return {
            success: 1,
            link: requestedUrl,
            meta: {
              title: title,
              description: description,
              site_name: siteName,
              image: image ? { url: image } : undefined,
            },
          };
        """
      timeout = 10
    } as $payload
  }

  response = $payload
}