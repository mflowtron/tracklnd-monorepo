// Query all event_purse_allocation records
query event_purse_allocation verb=GET {
  api_group = "Tracklnd"

  input {
    int limit?=100
    int page?=1
  
    // Filter by prize purse config ID
    uuid config_id?
  }

  stack {
    db.query event_purse_allocation {
      where = $db.event_purse_allocation.purse_config_id ==? $input.config_id
      eval = {
        config_id: $db.event_purse_allocation.purse_config_id
        meet_pct : $db.event_purse_allocation.allocation_percentage
      }
    
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $event_purse_allocation
  }

  response = $event_purse_allocation
}