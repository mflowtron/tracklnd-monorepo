table purse_seed_money {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
  
    // Prize purse config this seed money belongs to
    uuid config_id?
  
    // Event allocation targeted (null for meet-level)
    uuid? event_allocation_id?
  
    // Place allocation targeted (null for event/meet-level)
    uuid? place_allocation_id?
  
    // Seed money amount in dollars
    decimal amount?
  
    // Optional note about the seed money
    text note?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "config_id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}