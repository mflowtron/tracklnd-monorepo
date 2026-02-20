// Stores user information and allows the user to authenticate  against
table user {
  auth = true

  schema {
    int id
    timestamp created_at?=now
    text name filters=trim
    email? email filters=trim|lower
    password? password filters=min:8|minAlpha:1|minDigit:1
  
    // Optional contact info from Bubble import.
    text phone_number? filters=trim
  
    // Where this user originally registered (Bubble register_source_text).
    text register_source? filters=trim
  
    // Original signup date (Bubble Created Date).
    timestamp member_since?
  
    // Bubble User unique identifier (_id). Useful for idempotent imports.
    text bubble_user_id? filters=trim
  
    // The role of the user within their company (e.g., 'admin', 'member').
    enum role? {
      values = ["admin", "member"]
    }
  
    object password_reset? {
      schema {
        password token?
        timestamp? expiration?
        bool used?
      }
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree|unique", field: [{name: "email", op: "asc"}]}
    {
      type : "btree|unique"
      field: [{name: "bubble_user_id", op: "asc"}]
    }
  ]
}