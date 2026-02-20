// Query all athlete records
query athlete verb=GET {
  api_group = "Tracklnd"

  input {
    int limit?=100
    int page?=1
  }

  stack {
    db.query athlete {
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $athlete
  }

  response = $athlete
}