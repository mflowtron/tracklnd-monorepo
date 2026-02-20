query user_meet_access verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    int limit?=100
    int page?=1
  
    // Filter by user ID
    int user_id?
  
    // Filter by meet ID
    uuid meet_id?
  
    // Filter by access type (e.g., ppv)
    text access_type?
  }

  stack {
    // Determine if caller is admin
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    // Non-admins can only check their own access
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
      error = "You do not have permission to view these access records"
    }
  
    db.query user_meet_access {
      where = $db.user_meet_access.user_id ==? $effective_user_id && $db.user_meet_access.meet_id ==? $input.meet_id && $db.user_meet_access.access_type ==? $input.access_type
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $user_meet_access
  }

  response = $user_meet_access
}