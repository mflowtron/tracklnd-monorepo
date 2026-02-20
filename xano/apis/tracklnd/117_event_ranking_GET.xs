// Query all event_ranking records
query event_ranking verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    int limit?=100
    int page?=1
  
    // Filter by user ID
    int user_id?
  
    // Filter by event ID
    uuid event_id?
  
    // Filter by meet ID
    uuid meet_id?
  }

  stack {
    // Determine if caller is admin
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    // Non-admin users can only read their own rankings
    var $effective_user_id {
      value = $input.user_id
    }
  
    conditional {
      if ($effective_user_id == null) {
        var.update $effective_user_id {
          value = $auth.id
        }
      }
    }
  
    precondition ($effective_user_id == $auth.id || $is_admin) {
      error_type = "accessdenied"
      error = "You do not have permission to view these rankings"
    }
  
    db.query event_ranking {
      join = {
        event: {
          table: "event"
          type : "left"
          where: $db.event_ranking.event_id == $db.event.id
        }
      }
    
      where = $db.event_ranking.user_id == $effective_user_id && $db.event_ranking.event_id ==? $input.event_id && $db.event.meet_id ==? $input.meet_id
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $event_ranking
  }

  response = $event_ranking
}