// Get user_meet_access record
query "user_meet_access/{user_meet_access_id}" verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid user_meet_access_id?
  }

  stack {
    // Determine if caller is admin
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    db.get user_meet_access {
      field_name = "id"
      field_value = $input.user_meet_access_id
    } as $user_meet_access
  
    precondition ($user_meet_access != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  
    precondition ($user_meet_access.user_id == $auth.id || $is_admin) {
      error_type = "accessdenied"
      error = "You do not have permission to view this access record"
    }
  }

  response = $user_meet_access
}