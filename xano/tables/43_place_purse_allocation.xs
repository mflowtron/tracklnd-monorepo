table place_purse_allocation {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid event_purse_allocation_id? {
      table = "event_purse_allocation"
    }
  
    int place?
    decimal amount?
    decimal percentage?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree|unique"
      field: [{name: "event_purse_allocation_id"}, {name: "place"}]
    }
    {type: "btree", field: [{name: "event_purse_allocation_id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}