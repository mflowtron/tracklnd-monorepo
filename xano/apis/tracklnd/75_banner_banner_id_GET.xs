// Get banner record
query "banner/{banner_id}" verb=GET {
  api_group = "Tracklnd"

  input {
    uuid banner_id?
  }

  stack {
    db.get banner {
      field_name = "id"
      field_value = $input.banner_id
    } as $banner
  
    precondition ($banner != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $banner
}