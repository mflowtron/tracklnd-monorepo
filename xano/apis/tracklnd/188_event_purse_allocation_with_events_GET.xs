// Query event_purse_allocations with joined event data (name, gender), filtered by config_id
query "event_purse_allocation/with-events" verb=GET {
  api_group = "Tracklnd"

  input {
    int limit?=100
    int page?=1
  
    // Filter by prize purse config ID
    uuid config_id
  }

  stack {
    db.query event_purse_allocation {
      join = {
        event: {
          table: "event"
          where: $db.event_purse_allocation.event_id == $db.event.id
        }
      }
    
      where = $db.event_purse_allocation.purse_config_id == $input.config_id
      eval = {
        event_name  : $db.event.name
        event_gender: $db.event.gender
        event_id    : $db.event.id
      }
    
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $allocations
  }

  response = $allocations
}