// Get place_purse_allocation record
query "place_purse_allocation/{place_purse_allocation_id}" verb=GET {
  api_group = "Tracklnd"

  input {
    uuid place_purse_allocation_id?
  }

  stack {
    db.get place_purse_allocation {
      field_name = "id"
      field_value = $input.place_purse_allocation_id
    } as $place_purse_allocation
  
    precondition ($place_purse_allocation != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $place_purse_allocation
}