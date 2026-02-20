table event_purse_allocation {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid purse_config_id? {
      table = "prize_purse_config"
    }
  
    uuid event_id? {
      table = "event"
    }
  
    decimal allocation_amount?
    decimal allocation_percentage?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree|unique"
      field: [{name: "purse_config_id"}, {name: "event_id"}]
    }
    {type: "btree", field: [{name: "purse_config_id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}