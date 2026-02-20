// Query events with joined meet name, ordered by scheduled_time, with optional limit
query event_with_meets verb=GET {
  api_group = "Tracklnd"

  input {
    // Maximum number of results to return (default 5)
    int limit?=5
  
    // Page number for pagination
    int page?=1
  }

  stack {
    db.query event {
      join = {
        meet: {table: "meet", where: $db.event.meet_id == $db.meet.id}
      }
    
      sort = {event.scheduled_time: "asc"}
      eval = {meet_name: $db.meet.name, meet_id: $db.meet.id}
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $events
  }

  response = $events
}