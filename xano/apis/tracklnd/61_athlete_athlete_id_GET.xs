// Get athlete record
query "athlete/{athlete_id}" verb=GET {
  api_group = "Tracklnd"

  input {
    uuid athlete_id?
  }

  stack {
    db.get athlete {
      field_name = "id"
      field_value = $input.athlete_id
    } as $athlete
  
    precondition ($athlete != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $athlete
}