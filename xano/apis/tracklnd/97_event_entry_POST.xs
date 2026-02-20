// Add event_entry record
query event_entry verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
    dblink {
      table = "event_entry"
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
  
    db.add event_entry {
      data = {created_at: "now"}
    } as $event_entry
  }

  response = $event_entry
}