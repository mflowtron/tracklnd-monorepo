// Get meet record
query "meet/{meet_id}" verb=GET {
  api_group = "Tracklnd"

  input {
    uuid meet_id?
  }

  stack {
    db.get meet {
      field_name = "id"
      field_value = $input.meet_id
    } as $meet
  
    precondition ($meet != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $meet
}