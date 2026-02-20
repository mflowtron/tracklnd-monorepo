table newsletter_subscriber {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
  
    // Subscriber email address
    email email filters=trim|lower
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "email", op: "asc"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}