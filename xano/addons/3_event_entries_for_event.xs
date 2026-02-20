addon event_entries_for_event {
  input {
    uuid event_id? {
      table = "event"
    }
  }

  stack {
    db.query event_entry {
      join = {
        athlete: {
          table: "athlete"
          type : "left"
          where: $db.event_entry.athlete_id == $db.athlete.id
        }
      }
    
      where = $db.event_entry.event_id == $input.event_id
      eval = {
        _athlete_id          : $db.athlete.id
        _athlete_full_name   : $db.athlete.full_name
        _athlete_country_code: $db.athlete.country_code
        _athlete_team        : $db.athlete.team
        _athlete_headshot_url: $db.athlete.headshot_url
      }
    
      return = {type: "list"}
    }
  }
}