// Get purse_snapshot record
query "purse_snapshot/{purse_snapshot_id}" verb=GET {
  api_group = "Tracklnd"

  input {
    uuid purse_snapshot_id?
  }

  stack {
    db.get purse_snapshot {
      field_name = "id"
      field_value = $input.purse_snapshot_id
    } as $purse_snapshot
  
    precondition ($purse_snapshot != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $purse_snapshot
}