// Get event_purse_allocation record
query "event_purse_allocation/{event_purse_allocation_id}" verb=GET {
  api_group = "Tracklnd"

  input {
    uuid event_purse_allocation_id?
  }

  stack {
    db.get event_purse_allocation {
      field_name = "id"
      field_value = $input.event_purse_allocation_id
    } as $event_purse_allocation
  
    precondition ($event_purse_allocation != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $event_purse_allocation
}