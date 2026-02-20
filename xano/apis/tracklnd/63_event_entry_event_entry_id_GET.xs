// Get event_entry record
query "event_entry/{event_entry_id}" verb=GET {
  api_group = "Tracklnd"

  input {
    uuid event_entry_id?
  }

  stack {
    db.get event_entry {
      field_name = "id"
      field_value = $input.event_entry_id
    } as $event_entry
  
    precondition ($event_entry != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $event_entry
}