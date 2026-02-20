table user_role {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    int user_id? {
      table = "user"
    }
  
    text role?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "user_id"}]}
    {
      type : "btree|unique"
      field: [{name: "user_id"}, {name: "role"}]
    }
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}