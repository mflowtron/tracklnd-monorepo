// Delete purse_snapshot record.
query "purse_snapshot/{purse_snapshot_id}" verb=DELETE {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid purse_snapshot_id?
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
  
    db.del purse_snapshot {
      field_name = "id"
      field_value = $input.purse_snapshot_id
    }
  }

  response = null
}