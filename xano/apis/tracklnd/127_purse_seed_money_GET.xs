query purse_seed_money verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    int limit?=100
    int page?=1
  
    // Filter by prize purse config ID
    uuid config_id?
  
    // Filter by event purse allocation ID
    uuid event_allocation_id?
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
  
    db.query purse_seed_money {
      where = $db.purse_seed_money.config_id ==? $input.config_id && $db.purse_seed_money.event_allocation_id ==? $input.event_allocation_id
      sort = {purse_seed_money.created_at: "desc"}
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $purse_seed_money
  }

  response = $purse_seed_money
}