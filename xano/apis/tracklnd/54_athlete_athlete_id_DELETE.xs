// Delete athlete record.
query "athlete/{athlete_id}" verb=DELETE {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid athlete_id?
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
  
    db.del athlete {
      field_name = "id"
      field_value = $input.athlete_id
    }
  }

  response = null
}