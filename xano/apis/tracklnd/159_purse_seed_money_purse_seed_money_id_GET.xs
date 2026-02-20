// Get purse_seed_money record
query "purse_seed_money/{purse_seed_money_id}" verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid purse_seed_money_id?
  }

  stack {
    // Admin-only read
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can view seed money"
    }
  
    db.get purse_seed_money {
      field_name = "id"
      field_value = $input.purse_seed_money_id
    } as $purse_seed_money
  
    precondition ($purse_seed_money != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $purse_seed_money
}