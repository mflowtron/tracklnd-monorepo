// Delete purse_contribution record
query "purse_contribution/{purse_contribution_id}" verb=DELETE {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid purse_contribution_id?
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
  
    db.del purse_contribution {
      field_name = "id"
      field_value = $input.purse_contribution_id
    }
  }

  response = null
}