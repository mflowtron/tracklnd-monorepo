// Delete prize_purse_config record.
query "prize_purse_config/{prize_purse_config_id}" verb=DELETE {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid prize_purse_config_id?
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
  
    db.del prize_purse_config {
      field_name = "id"
      field_value = $input.prize_purse_config_id
    }
  }

  response = null
}