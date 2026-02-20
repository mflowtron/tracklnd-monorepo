// Edit purse_contribution record
query "purse_contribution/{purse_contribution_id}" verb=PATCH {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid purse_contribution_id?
    dblink {
      table = "purse_contribution"
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
  
    db.patch purse_contribution {
      field_name = "id"
      field_value = $input.purse_contribution_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $purse_contribution
  }

  response = $purse_contribution
}