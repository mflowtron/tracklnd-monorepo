table event_entry {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid event_id? {
      table = "event"
    }
  
    uuid athlete_id? {
      table = "athlete"
    }
  
    int lane?
    text bib_number?
    text result?
    int result_ms?
    int place?
    bool is_pb?
    bool is_sb?
    text status?
    text notes?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree|unique"
      field: [{name: "event_id"}, {name: "athlete_id"}]
    }
    {type: "btree", field: [{name: "event_id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}