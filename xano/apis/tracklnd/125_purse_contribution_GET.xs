query purse_contribution verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    int limit?=100
    int page?=1
  
    // Filter by prize purse config ID
    uuid config_id?
  
    // Filter by user ID
    int user_id?
  
    // Filter by source type (ppv, direct, seed)
    text source_type?
  }

  stack {
    // Determine if caller is admin
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    // Non-admin users can only read their own contributions
    var $effective_user_id {
      value = $input.user_id
    }
  
    conditional {
      if ($effective_user_id == null && $is_admin == false) {
        var.update $effective_user_id {
          value = $auth.id
        }
      }
    }
  
    precondition ($effective_user_id == null || $effective_user_id == $auth.id || $is_admin) {
      error_type = "accessdenied"
      error = "You do not have permission to view these contributions"
    }
  
    db.query purse_contribution {
      where = $db.purse_contribution.config_id ==? $input.config_id && $db.purse_contribution.user_id ==? $effective_user_id && $db.purse_contribution.source_type ==? $input.source_type
      sort = {purse_contribution.created_at: "desc"}
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $purse_contribution
  }

  response = $purse_contribution
}