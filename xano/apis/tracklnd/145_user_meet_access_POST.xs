// Add user_meet_access record
query user_meet_access verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
    dblink {
      table = "user_meet_access"
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
      error = "Only administrators can create access records"
    }
  
    db.add user_meet_access {
      data = {created_at: "now"}
    } as $user_meet_access
  }

  response = $user_meet_access
}