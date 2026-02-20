// Edit event record
query "event/{event_id}" verb=PATCH {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid event_id?
    dblink {
      table = "event"
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
  
    db.patch event {
      field_name = "id"
      field_value = $input.event_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $event
  }

  response = $event
}