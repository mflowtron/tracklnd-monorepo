table meet_graphics_state {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    timestamp updated_at?=now
    uuid meet_id? {
      table = "meet"
    }
  
    uuid channel_key?
    json state?
    int revision?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "meet_id"}]}
    {type: "btree|unique", field: [{name: "channel_key"}]}
    {type: "btree", field: [{name: "updated_at", op: "desc"}]}
  ]
}