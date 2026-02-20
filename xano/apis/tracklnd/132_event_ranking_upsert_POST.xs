// Create or update the current user's event picks (disabled for archived meets)
query "event_ranking/upsert" verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
    // Event ID to rank
    uuid event_id
  
    // Array of athlete IDs in ranked order
    json ranked_athlete_ids
  }

  stack {
    db.get event {
      field_name = "id"
      field_value = $input.event_id
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
  
    var $predicted_winner_id {
      value = $input.ranked_athlete_ids|first
    }
  
    // Check if ranking already exists for this user + event
    db.query event_ranking {
      where = $db.event_ranking.user_id == $auth.id && $db.event_ranking.event_id == $input.event_id
      return = {type: "single"}
    } as $existing
  
    conditional {
      if ($existing != null) {
        // Update existing ranking
        db.edit event_ranking {
          field_name = "id"
          field_value = $existing.id
          data = {
            predicted_winner_id: $predicted_winner_id
            ranked_athlete_ids : $input.ranked_athlete_ids
            predicted_places   : ""
            updated_at         : "now"
          }
        } as $ranking
      }
    
      else {
        // Create new ranking
        db.add event_ranking {
          data = {
            created_at         : "now"
            updated_at         : "now"
            user_id            : $auth.id
            event_id           : $input.event_id
            predicted_winner_id: $predicted_winner_id
            ranked_athlete_ids : $input.ranked_athlete_ids
            predicted_places   : ""
            score              : 0
          }
        } as $ranking
      }
    }
  }

  response = $ranking
}