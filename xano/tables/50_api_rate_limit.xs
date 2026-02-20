table api_rate_limit {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    timestamp updated_at?=now
  
    // Unique key for this rate-limit bucket (user + endpoint + minute)
    text rate_key?
  
    // Authenticated user tied to this request bucket
    int user_id? {
      table = "user"
    }
  
    // Endpoint name (for example: payment/process-square)
    text endpoint?
  
    // Minute bucket in Unix milliseconds/60000
    int window_bucket?
  
    // Number of hits seen in the current bucket
    int hit_count?
  
    // Most recent request correlation ID
    text request_id?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "rate_key"}]}
    {type: "btree", field: [{name: "user_id"}]}
    {
      type : "btree"
      field: [{name: "endpoint"}, {name: "window_bucket"}]
    }
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}