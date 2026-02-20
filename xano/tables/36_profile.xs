table profile {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    int user_id? {
      table = "user"
    }
  
    text display_name?
    text avatar_url?
    text bio?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "user_id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}