// Query meet records with optional filters
query meet verb=GET {
  api_group = "Tracklnd"

  input {
    int limit?=100
    int page?=1
  
    // Filter by status (e.g., upcoming, live, completed)
    text status?
  
    // Filter by slug (exact match)
    text slug?
  }

  stack {
    db.query meet {
      where = $db.meet.status ==? $input.status && $db.meet.slug ==? $input.slug
      sort = {meet.start_date: "desc"}
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit, totals: true}
      }
    } as $meet_rows
  
    var $rows_items {
      value = $meet_rows|get:"items":[]
    }
  
    var $meets {
      value = []
    }
  
    foreach ($rows_items) {
      each as $m {
        array.push $meets {
          value = {
            id                 : $m.id
            name               : $m.name
            slug               : $m.slug
            status             : $m.status
            description        : $m.description
            start_date         : $m.start_date
            end_date           : $m.end_date
            venue              : $m.venue
            location           : $m.location
            location_name      : $m.location_name
            location_city      : $m.location_city
            location_state     : $m.location_state
            location_country   : $m.location_country
            banner_image_url   : $m.banner_image_url
            hero_video_url     : $m.hero_video_url
            thumbnail_image_url: $m.thumbnail_image_url
            thumbnail_blurhash : $m.thumbnail_blurhash
            broadcast_partner  : $m.broadcast_partner
            broadcast_url      : $m.broadcast_url
            cta_label          : $m.cta_label
            cta_url            : $m.cta_url
            featured           : $m.featured
            published          : $m.published
            updated_at         : $m.updated_at
          }
        }
      }
    }
  }

  response = {
    items        : $meets
    itemsReceived: $meet_rows|get:"itemsReceived":0
    curPage      : $meet_rows|get:"curPage":$input.page
    nextPage     : $meet_rows|get:"nextPage":null
    prevPage     : $meet_rows|get:"prevPage":null
    offset       : $meet_rows|get:"offset":0
    perPage      : $meet_rows|get:"perPage":$input.limit
    itemsTotal   : $meet_rows|get:"itemsTotal":($meet_rows|get:"itemsReceived":0)
    pageTotal    : $meet_rows|get:"pageTotal":1
  }
}