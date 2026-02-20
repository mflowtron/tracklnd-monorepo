// Query event records with optional filters
query event verb=GET {
  api_group = "Tracklnd"

  input {
    int limit?=100
    int page?=1
  
    // Filter by meet ID
    uuid meet_id?
  }

  stack {
    db.query event {
      where = $db.event.meet_id ==? $input.meet_id
      sort = {event.sort_order: "asc"}
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $event
  }

  response = $event
}