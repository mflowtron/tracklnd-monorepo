// Delete user_role record.
query "user_role/{user_role_id}" verb=DELETE {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid user_role_id?
  }

  stack {
    // Admin-only mutation
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can delete roles"
    }
  
    db.del user_role {
      field_name = "id"
      field_value = $input.user_role_id
    }
  }

  response = null
}