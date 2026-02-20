// Query event purse allocations with joined event data
query event_purse_allocation_with_events verb=GET {
  api_group = "Tracklnd"

  input {
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
    
      return = {type: "list"}
    } as $allocations
  }

  response = $allocations
}