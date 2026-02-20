// Add purse_refund record
query purse_refund verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
    dblink {
      table = "purse_refund"
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
  
    db.add purse_refund {
      data = {created_at: "now"}
    } as $purse_refund
  }

  response = $purse_refund
}