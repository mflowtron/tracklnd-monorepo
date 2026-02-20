// Query events with nested event_entries and athlete data, filtered by meet_id
query event_with_entries verb=GET {
  api_group = "Tracklnd"

  input {
    int limit?=100
    int page?=1
  
    // Filter events by meet ID
    uuid meet_id
  }

  stack {
    db.query event {
      where = $db.event.meet_id == $input.meet_id
      sort = {event.sort_order: "asc"}
      return = {type: "list"}
    } as $events
  
    var $events_with_entries {
      value = []
    }
  
    foreach ($events) {
      each as $event {
        db.query event_entry {
          join = {
            athlete: {
              table: "athlete"
              type : "left"
              where: $db.event_entry.athlete_id == $db.athlete.id
            }
          }
        
          where = $db.event_entry.event_id == $event.id
          eval = {
            _athlete_id          : $db.athlete.id
            _athlete_full_name   : $db.athlete.full_name
            _athlete_country_code: $db.athlete.country_code
            _athlete_team        : $db.athlete.team
            _athlete_headshot_url: $db.athlete.headshot_url
          }
        
          return = {type: "list"}
        } as $event_entries
      
        array.push $events_with_entries {
          value = $event
            |set:"event_entries":$event_entries
        }
      }
    }
  }

  response = $events_with_entries
}