// Get prize_purse_config record
query "prize_purse_config/{prize_purse_config_id}" verb=GET {
  api_group = "Tracklnd"

  input {
    uuid prize_purse_config_id?
  }

  stack {
    db.get prize_purse_config {
      field_name = "id"
      field_value = $input.prize_purse_config_id
    } as $prize_purse_config
  
    precondition ($prize_purse_config != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $prize_purse_config
}