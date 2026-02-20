// Query event_entry records with optional filters
query event_entry verb=GET {
  api_group = "Tracklnd"

  input {
    int limit?=100
    int page?=1
  
    // Filter by event ID
    uuid event_id?
  }

  stack {
    db.query event_entry {
      where = $db.event_entry.event_id ==? $input.event_id
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $event_entry
  }

  response = $event_entry
}