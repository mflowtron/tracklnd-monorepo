// Edit prize_purse_config record
query "prize_purse_config/{prize_purse_config_id}" verb=PATCH {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid prize_purse_config_id?
    dblink {
      table = "prize_purse_config"
    }
  }

  stack {
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can perform this action"
    }
  
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch prize_purse_config {
      field_name = "id"
      field_value = $input.prize_purse_config_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $prize_purse_config
  }

  response = $prize_purse_config
}