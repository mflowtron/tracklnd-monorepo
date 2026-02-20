// Get purse_refund record
query "purse_refund/{purse_refund_id}" verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid purse_refund_id?
  }

  stack {
    // Determine if caller is admin
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    db.get purse_refund {
      field_name = "id"
      field_value = $input.purse_refund_id
    } as $purse_refund
  
    precondition ($purse_refund != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  
    conditional {
      if ($is_admin == false) {
        db.get purse_contribution {
          field_name = "id"
          field_value = $purse_refund.contribution_id
        } as $contribution
      
        precondition ($contribution != null) {
          error_type = "notfound"
          error = "Not Found."
        }
      
        precondition ($contribution.user_id == $auth.id) {
          error_type = "accessdenied"
          error = "You do not have permission to view this refund"
        }
      }
    }
  }

  response = $purse_refund
}