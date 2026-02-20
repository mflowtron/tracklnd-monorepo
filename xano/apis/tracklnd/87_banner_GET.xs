// Query banner records with optional filters
query banner verb=GET {
  api_group = "Tracklnd"

  input {
    int limit?=100
    int page?=1
  
    // Filter by placement (e.g., homepage, meet)
    text placement?
  
    // Filter by active status
    bool is_active?
  
    // Filter by meet ID
    uuid meet_id?
  }

  stack {
    db.query banner {
      where = $db.banner.placement ==? $input.placement && $db.banner.is_active ==? $input.is_active && $db.banner.meet_id ==? $input.meet_id
      sort = {banner.sort_order: "asc"}
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit, totals: true}
      }
    } as $banner_rows
  
    var $banners {
      value = []
    }
  
    foreach ($banner_rows.items) {
      each as $banner {
        array.push $banners {
          value = {
            id            : $banner.id
            title         : $banner.title
            subtitle      : $banner.subtitle
            image_url     : $banner.image_url
            image_blurhash: $banner.image_blurhash
            cta_label     : $banner.cta_label
            cta_url       : $banner.cta_url
            placement     : $banner.placement
            is_active     : $banner.is_active
            meet_id       : $banner.meet_id
            sort_order    : $banner.sort_order
            created_at    : $banner.created_at
            updated_at    : $banner.updated_at
          }
        }
      }
    }
  }

  response = {
    items        : $banners
    itemsReceived: $banner_rows.itemsReceived
    curPage      : $banner_rows.curPage
    nextPage     : $banner_rows.nextPage
    prevPage     : $banner_rows.prevPage
    offset       : $banner_rows.offset
    perPage      : $banner_rows.perPage
    itemsTotal   : $banner_rows.itemsTotal
    pageTotal    : $banner_rows.pageTotal
  }
}