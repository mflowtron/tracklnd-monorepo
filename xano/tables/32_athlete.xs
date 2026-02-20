table athlete {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    text full_name?
    text first_name?
    text last_name?
    text country_code?
    text nationality?
    text team?
    text headshot_url?
    text bio?
    date date_of_birth?
    text gender?
    bool active?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}