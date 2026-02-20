// Get event_ranking record
query "event_ranking/{event_ranking_id}" verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid event_ranking_id?
  }

  stack {
    // Determine if caller is admin
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    db.get event_ranking {
      field_name = "id"
      field_value = $input.event_ranking_id
    } as $event_ranking
  
    precondition ($event_ranking != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  
    precondition ($event_ranking.user_id == $auth.id || $is_admin) {
      error_type = "accessdenied"
      error = "You do not have permission to view this ranking"
    }
  }

  response = $event_ranking
}