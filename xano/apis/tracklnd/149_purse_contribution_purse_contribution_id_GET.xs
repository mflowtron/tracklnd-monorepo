// Get purse_contribution record
query "purse_contribution/{purse_contribution_id}" verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid purse_contribution_id?
  }

  stack {
    // Determine if caller is admin
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    db.get purse_contribution {
      field_name = "id"
      field_value = $input.purse_contribution_id
    } as $purse_contribution
  
    precondition ($purse_contribution != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  
    precondition ($purse_contribution.user_id == $auth.id || $is_admin) {
      error_type = "accessdenied"
      error = "You do not have permission to view this contribution"
    }
  }

  response = $purse_contribution
}