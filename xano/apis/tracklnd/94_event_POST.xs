// Add event record
query event verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
    dblink {
      table = "event"
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
  
    db.add event {
      data = {created_at: "now"}
    } as $event
  }

  response = $event
}