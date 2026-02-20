// Get profile record
query "profile/{profile_id}" verb=GET {
  api_group = "Tracklnd"

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
      error = "Not Found."
    }
  }

  response = $profile
}