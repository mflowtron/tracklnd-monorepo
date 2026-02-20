// Query all newsletter_subscriber records
query newsletter_subscriber verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    int limit?=100
    int page?=1
  }

  stack {
    // Admin-only read
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can view subscribers"
    }
  
    db.query newsletter_subscriber {
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $newsletter_subscriber
  }

  response = $newsletter_subscriber
}