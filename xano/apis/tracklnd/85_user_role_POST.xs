// Add user_role record
query user_role verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
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
      error = "Only administrators can perform this action"
    }
  
    db.add user_role {
      data = {created_at: "now"}
    } as $user_role
  }

  response = $user_role
}