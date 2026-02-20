// Delete place_purse_allocation record.
query "place_purse_allocation/{place_purse_allocation_id}" verb=DELETE {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid place_purse_allocation_id?
  }

  stack {
    db.del place_purse_allocation {
      field_name = "id"
      field_value = $input.place_purse_allocation_id
    }
  }

  response = null
}