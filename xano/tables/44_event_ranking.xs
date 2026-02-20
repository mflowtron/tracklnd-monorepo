table event_ranking {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    int user_id? {
      table = "user"
    }
  
    uuid event_id? {
      table = "event"
    }
  
    uuid predicted_winner_id? {
      table = "athlete"
    }
  
    json ranked_athlete_ids?
    text predicted_places?
    int score?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree|unique"
      field: [{name: "user_id"}, {name: "event_id"}]
    }
    {type: "btree", field: [{name: "event_id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}