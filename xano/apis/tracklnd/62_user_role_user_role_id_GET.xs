// Get user_role record
query "user_role/{user_role_id}" verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid user_role_id?
  }

  stack {
    // Determine if caller is admin
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    db.get user_role {
      field_name = "id"
      field_value = $input.user_role_id
    } as $user_role
  
    precondition ($user_role != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  
    precondition ($user_role.user_id == $auth.id || $is_admin) {
      error_type = "accessdenied"
      error = "You do not have permission to view this role"
    }
  }

  response = $user_role
}