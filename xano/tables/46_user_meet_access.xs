table user_meet_access {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
  
    // User who was granted access
    int user_id?
  
    // Meet the user has access to
    uuid meet_id?
  
    // Type of access granted (e.g., ppv)
    text access_type?
  
    // When access was granted
    timestamp granted_at?=now
  
    // When access was revoked (null if active)
    timestamp revoked_at?
  
    // Square payment ID associated with access
    text square_payment_id?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree|unique"
      field: [{name: "user_id"}, {name: "meet_id"}]
    }
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}