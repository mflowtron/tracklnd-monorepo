addon event_ranking_count {
  input {
    uuid event_id? {
      table = "event"
    }
  }

  stack {
    db.query event_ranking {
      where = $db.event_ranking.event_id == $input.event_id
      return = {type: "count"}
    }
  }
}