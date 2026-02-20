// Edit profile record
query "profile/{profile_id}" verb=PATCH {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid profile_id?
    dblink {
      table = "profile"
    }
  }

  stack {
    db.get profile {
      field_name = "id"
      field_value = $input.profile_id
    } as $existing_profile
  
    precondition ($existing_profile != null) {
      error_type = "notfound"
      error = "Profile not found"
    }
  
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($existing_profile.user_id == $auth.id || $is_admin) {
      error_type = "accessdenied"
      error = "You do not have permission to update this profile"
    }
  
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch profile {
      field_name = "id"
      field_value = $input.profile_id
      data = `(\`$input|pick:($raw_input|keys)\`|filter_null|filter_empty_text)|set:"user_id":$existing_profile.user_id`
    } as $profile
  }

  response = $profile
}