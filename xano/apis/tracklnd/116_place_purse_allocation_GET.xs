// Query all place_purse_allocation records
query place_purse_allocation verb=GET {
  api_group = "Tracklnd"

  input {
    int limit?=100
    int page?=1
  
    // Filter by event purse allocation ID
    uuid event_allocation_id?
  }

  stack {
    db.query place_purse_allocation {
      where = $db.place_purse_allocation.event_purse_allocation_id ==? $input.event_allocation_id
      eval = {
        event_allocation_id: $db.place_purse_allocation.event_purse_allocation_id
        event_pct          : $db.place_purse_allocation.percentage
      }
    
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $place_purse_allocation
  }

  response = $place_purse_allocation
}