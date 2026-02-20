// Delete event_ranking record.
// Delete a user's event picks (disabled for archived meets)
query "event_ranking/{event_ranking_id}" verb=DELETE {
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
    } as $existing_ranking
  
    precondition ($existing_ranking != null) {
      error_type = "notfound"
      error = "Ranking not found"
    }
  
    precondition ($existing_ranking.user_id == $auth.id || $is_admin) {
      error_type = "accessdenied"
      error = "You do not have permission to delete this ranking"
    }
  
    db.get event {
      field_name = "id"
      field_value = $existing_ranking.event_id
    } as $event
  
    precondition ($event != null) {
      error_type = "notfound"
      error = "Event not found"
    }
  
    db.get meet {
      field_name = "id"
      field_value = $event.meet_id
    } as $meet
  
    precondition ($meet != null) {
      error_type = "notfound"
      error = "Meet not found"
    }
  
    precondition ($meet.status != "archived") {
      error_type = "accessdenied"
      error = "Picks are disabled for archived meets"
    }
  
    db.del event_ranking {
      field_name = "id"
      field_value = $input.event_ranking_id
    }
  }

  response = null
}