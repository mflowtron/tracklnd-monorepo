// Get broadcast record
query "broadcast/{broadcast_id}" verb=GET {
  api_group = "Tracklnd"

  input {
    uuid broadcast_id?
  }

  stack {
    db.get broadcast {
      field_name = "id"
      field_value = $input.broadcast_id
    } as $broadcast
  
    precondition ($broadcast != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $broadcast
}