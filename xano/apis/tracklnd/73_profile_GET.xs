// Query all profile records
query profile verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    int limit?=100
    int page?=1
  
    // Filter by user ID
    int user_id?
  }

  stack {
    // Determine if caller is admin
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    // Non-admin users can only read their own profile
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
      error = "You do not have permission to view these profiles"
    }
  
    db.query profile {
      where = $db.profile.user_id ==? $effective_user_id
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $profile
  }

  response = $profile
}