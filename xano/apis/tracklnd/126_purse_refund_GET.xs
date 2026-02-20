query purse_refund verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    int limit?=100
    int page?=1
  
    // Filter by prize purse config ID
    uuid config_id?
  
    // Filter by contribution ID
    uuid contribution_id?
  }

  stack {
    // Determine if caller is admin
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    conditional {
      if ($is_admin) {
        db.query purse_refund {
          where = $db.purse_refund.config_id ==? $input.config_id && $db.purse_refund.contribution_id ==? $input.contribution_id
          sort = {purse_refund.created_at: "desc"}
          return = {
            type  : "list"
            paging: {page: $input.page, per_page: $input.limit}
          }
        } as $purse_refund
      }
    
      else {
        db.query purse_refund {
          join = {
            contribution: {
              table: "purse_contribution"
              type : "left"
              where: $db.purse_refund.contribution_id == $db.contribution.id
            }
          }
        
          where = $db.purse_refund.config_id ==? $input.config_id && $db.purse_refund.contribution_id ==? $input.contribution_id && $db.contribution.user_id == $auth.id
          sort = {purse_refund.created_at: "desc"}
          return = {
            type  : "list"
            paging: {page: $input.page, per_page: $input.limit}
          }
        } as $purse_refund
      }
    }
  }

  response = $purse_refund
}