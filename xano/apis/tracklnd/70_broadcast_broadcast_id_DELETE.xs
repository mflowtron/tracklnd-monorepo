// Delete broadcast record.
query "broadcast/{broadcast_id}" verb=DELETE {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid broadcast_id?
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
  
    db.del broadcast {
      field_name = "id"
      field_value = $input.broadcast_id
    }
  }

  response = null
}