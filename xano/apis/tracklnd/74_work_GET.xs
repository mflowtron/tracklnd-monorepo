// Query work records with optional filters.
// Returns a lightweight list for listing pages, plus paging metadata + type counts.
query work verb=GET {
  api_group = "Tracklnd"

  input {
    int limit?=12
    int page?=1
  
    // Filter by work type (e.g., short, work, feature)
    text work_type?
  
    // Filter by status (e.g., published, draft)
    text status?
  
    // Filter by slug (exact match)
    text slug?
  
    // Exclude a specific work ID from results
    uuid exclude_id?
  
    // Include the full HTML body field (expensive); default false.
    bool include_body?
  }

  stack {
    db.query work {
      where = $db.work.work_type ==? $input.work_type && $db.work.status ==? $input.status && $db.work.slug ==? $input.slug && $db.work.id !=? $input.exclude_id
      sort = {work.published_at: "desc"}
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit, totals: true}
      }
    } as $work_rows
  
    var $works {
      value = []
    }
  
    foreach ($work_rows.items) {
      each as $w {
        var $item {
          value = {
            id                : $w.id
            title             : $w.title
            slug              : $w.slug
            excerpt           : $w.excerpt
            featured_image_url: $w.featured_image_url
            work_type         : $w.work_type
            status            : $w.status
            published_at      : $w.published_at
            author_id         : $w.author_id
            tags              : $w.tags
            updated_at        : $w.updated_at
          }
        }
      
        conditional {
          if ($input.include_body) {
            var.update $item.body {
              value = $w.body
            }
          }
        }
      
        array.push $works {
          value = $item
        }
      }
    }
  
    // Filter counts for chips (based on status only)
    db.query work {
      where = $db.work.status ==? $input.status
      return = {type: "count"}
    } as $count_all
  
    db.query work {
      where = $db.work.status ==? $input.status && $db.work.work_type == "short"
      return = {type: "count"}
    } as $count_short
  
    db.query work {
      where = $db.work.status ==? $input.status && $db.work.work_type == "work"
      return = {type: "count"}
    } as $count_work
  
    db.query work {
      where = $db.work.status ==? $input.status && $db.work.work_type == "feature"
      return = {type: "count"}
    } as $count_feature
  }

  response = {
    works : $works
    paging: ```
      {
        itemsReceived: $work_rows.itemsReceived
        curPage      : $work_rows.curPage
        nextPage     : $work_rows.nextPage
        prevPage     : $work_rows.prevPage
        offset       : $work_rows.offset
        perPage      : $work_rows.perPage
        itemsTotal   : $work_rows.itemsTotal
        pageTotal    : $work_rows.pageTotal
      }
      ```
    counts: ```
      {
        all    : $count_all
        short  : $count_short
        work   : $count_work
        feature: $count_feature
      }
      ```
  }
}