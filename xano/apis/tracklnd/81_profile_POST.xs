// Add profile record
query profile verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
    dblink {
      table = "profile"
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
  
    db.add profile {
      data = {created_at: "now"}
    } as $profile
  }

  response = $profile
}