// Get pick counts per event for a given meet
query event_pick_counts verb=GET {
  api_group = "Tracklnd"

  input {
    int limit?=100
    int page?=1
  
    // Meet ID to get event pick counts for
    uuid meet_id
  }

  stack {
    db.query event {
      where = $db.event.meet_id == $input.meet_id
      sort = {event.sort_order: "asc"}
      return = {type: "list"}
    } as $events
  
    var $events_with_counts {
      value = []
    }
  
    foreach ($events) {
      each as $event {
        db.query event_ranking {
          where = $db.event_ranking.event_id == $event.id
          return = {type: "list"}
        } as $rankings
      
        array.push $events_with_counts {
          value = $event
            |set:"pick_count":($rankings|count)
        }
      }
    }
  }

  response = $events_with_counts
}