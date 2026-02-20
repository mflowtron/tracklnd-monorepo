// Delete profile record.
query "profile/{profile_id}" verb=DELETE {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid profile_id?
  }

  stack {
    db.get profile {
      field_name = "id"
      field_value = $input.profile_id
    } as $profile
  
    precondition ($profile != null) {
      error_type = "notfound"
      error = "Profile not found"
    }
  
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($profile.user_id == $auth.id || $is_admin) {
      error_type = "accessdenied"
      error = "You do not have permission to delete this profile"
    }
  
    db.del profile {
      field_name = "id"
      field_value = $input.profile_id
    }
  }

  response = null
}