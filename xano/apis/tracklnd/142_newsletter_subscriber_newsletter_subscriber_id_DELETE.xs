// Delete newsletter_subscriber record
query "newsletter_subscriber/{newsletter_subscriber_id}" verb=DELETE {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid newsletter_subscriber_id?
  }

  stack {
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can perform this action"
    }
  
    db.del newsletter_subscriber {
      field_name = "id"
      field_value = $input.newsletter_subscriber_id
    }
  }

  response = null
}