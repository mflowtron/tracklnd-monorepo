// Edit user_role record
query "user_role/{user_role_id}" verb=PATCH {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid user_role_id?
    dblink {
      table = "user_role"
    }
  }

  stack {
    // Admin-only mutation
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can update roles"
    }
  
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch user_role {
      field_name = "id"
      field_value = $input.user_role_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $user_role
  }

  response = $user_role
}