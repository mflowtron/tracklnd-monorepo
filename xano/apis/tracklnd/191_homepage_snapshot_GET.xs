// Homepage snapshot payload: banner + shorts + upcoming meets + recent works
query "homepage/snapshot" verb=GET {
  api_group = "Tracklnd"

  input {
    // Max weekly shorts to return
    int shorts_limit?=8
  
    // Max upcoming meets to return
    int meets_limit?=6
  
    // Max recent feature works to return
    int recent_limit?=8
  
    // Candidate pool for recent works before filtering by type
    int recent_pool_limit?=24
  }

  stack {
    db.query banner {
      where = $db.banner.placement == "homepage" && $db.banner.is_active == true
      sort = {banner.sort_order: "asc"}
      return = {type: "list", paging: {page: 1, per_page: 1}}
    } as $banner_rows
  
    var $banner {
      value = null
    }
  
    conditional {
      if (($banner_rows.items|count) > 0) {
        var.update $banner {
          value = {
            id            : $banner_rows.items[0].id
            title         : $banner_rows.items[0].title
            subtitle      : $banner_rows.items[0].subtitle
            image_url     : $banner_rows.items[0].image_url
            image_blurhash: $banner_rows.items[0].image_blurhash
            cta_label     : $banner_rows.items[0].cta_label
            cta_url       : $banner_rows.items[0].cta_url
          }
        }
      }
    }
  
    db.query work {
      where = $db.work.status == "published" && $db.work.work_type == "short"
      sort = {work.published_at: "desc"}
      return = {
        type  : "list"
        paging: {page: 1, per_page: $input.shorts_limit}
      }
    } as $short_rows
  
    var $shorts {
      value = []
    }
  
    foreach ($short_rows.items) {
      each as $short {
        array.push $shorts {
          value = {
            id                 : $short.id
            slug               : $short.slug
            title              : $short.title
            featured_image_url : $short.featured_image_url
            thumbnail_image_url: $short.thumbnail_image_url
            thumbnail_blurhash : $short.thumbnail_blurhash
            published_at       : $short.published_at
          }
        }
      }
    }
  
    db.query meet {
      where = $db.meet.status == "upcoming"
      sort = {meet.start_date: "desc"}
      return = {
        type  : "list"
        paging: {page: 1, per_page: $input.meets_limit}
      }
    } as $meet_rows
  
    var $upcoming_meets {
      value = []
    }
  
    foreach ($meet_rows.items) {
      each as $meet {
        array.push $upcoming_meets {
          value = {
            id                 : $meet.id
            slug               : $meet.slug
            name               : $meet.name
            status             : $meet.status
            start_date         : $meet.start_date
            end_date           : $meet.end_date
            venue              : $meet.venue
            location           : $meet.location
            banner_image_url   : $meet.banner_image_url
            thumbnail_image_url: $meet.thumbnail_image_url
            thumbnail_blurhash : $meet.thumbnail_blurhash
          }
        }
      }
    }
  
    db.query work {
      where = $db.work.status == "published" && $db.work.work_type == "feature"
      sort = {work.published_at: "desc"}
      return = {
        type  : "list"
        paging: {page: 1, per_page: $input.recent_pool_limit}
      }
    } as $recent_candidates
  
    var $recent_works {
      value = []
    }
  
    foreach ($recent_candidates.items) {
      each as $work {
        conditional {
          if (($recent_works|count) < $input.recent_limit) {
            array.push $recent_works {
              value = {
                id                 : $work.id
                slug               : $work.slug
                title              : $work.title
                featured_image_url : $work.featured_image_url
                thumbnail_image_url: $work.thumbnail_image_url
                thumbnail_blurhash : $work.thumbnail_blurhash
                work_type          : "feature"
                excerpt            : $work.excerpt
                published_at       : $work.published_at
              }
            }
          }
        }
      }
    }
  }

  response = {
    banner        : $banner
    shorts        : $shorts
    upcoming_meets: $upcoming_meets
    recent_works  : $recent_works
  }
}