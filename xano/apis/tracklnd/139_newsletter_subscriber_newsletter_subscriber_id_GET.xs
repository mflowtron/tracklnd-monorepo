// Get newsletter_subscriber record
query "newsletter_subscriber/{newsletter_subscriber_id}" verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid newsletter_subscriber_id?
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
  
    db.get newsletter_subscriber {
      field_name = "id"
      field_value = $input.newsletter_subscriber_id
    } as $newsletter_subscriber
  
    precondition ($newsletter_subscriber != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $newsletter_subscriber
}