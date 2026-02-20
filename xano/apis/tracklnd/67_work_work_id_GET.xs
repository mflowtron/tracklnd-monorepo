// Get work record
query "work/{work_id}" verb=GET {
  api_group = "Tracklnd"

  input {
    uuid work_id?
  }

  stack {
    db.get work {
      field_name = "id"
      field_value = $input.work_id
    } as $work
  
    precondition ($work != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $work
}