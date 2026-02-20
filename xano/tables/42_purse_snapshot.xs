table purse_snapshot {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid purse_config_id? {
      table = "prize_purse_config"
    }
  
    decimal total_contributed?
    int contributor_count?
    timestamp snapshot_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}