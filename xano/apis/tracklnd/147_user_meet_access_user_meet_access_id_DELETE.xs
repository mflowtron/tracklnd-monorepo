// Delete user_meet_access record
query "user_meet_access/{user_meet_access_id}" verb=DELETE {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid user_meet_access_id?
  }

  stack {
    // Admin-only mutation
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can delete access records"
    }
  
    db.del user_meet_access {
      field_name = "id"
      field_value = $input.user_meet_access_id
    }
  }

  response = null
}