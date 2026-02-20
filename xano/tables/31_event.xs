table event {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid meet_id? {
      table = "meet"
    }
  
    text name?
    text event_type?
    text gender?
    text distance?
    text round?
    int sort_order?
    timestamp scheduled_time?
    text status?
    text wind_reading?
    text notes?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree"
      field: [{name: "meet_id"}, {name: "sort_order"}]
    }
    {
      type : "btree"
      field: [{name: "meet_id"}, {name: "scheduled_time"}]
    }
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}