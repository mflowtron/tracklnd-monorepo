// Query broadcast records with optional filters
query broadcast verb=GET {
  api_group = "Tracklnd"

  input {
    int limit?=100
    int page?=1
  
    // Filter by meet ID
    uuid meet_id?
  
    // Filter by active status
    bool is_active?
  }

  stack {
    db.query broadcast {
      where = $db.broadcast.meet_id ==? $input.meet_id && $db.broadcast.is_active ==? $input.is_active
      sort = {broadcast.created_at: "desc"}
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $broadcast
  }

  response = $broadcast
}