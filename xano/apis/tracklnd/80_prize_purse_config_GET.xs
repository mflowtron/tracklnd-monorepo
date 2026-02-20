// Query all prize_purse_config records
query prize_purse_config verb=GET {
  api_group = "Tracklnd"

  input {
    int limit?=100
    int page?=1
  
    // Filter by meet ID
    uuid meet_id?
  }

  stack {
    db.query prize_purse_config {
      where = $db.prize_purse_config.meet_id ==? $input.meet_id
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.limit}
      }
    } as $prize_purse_config
  }

  response = $prize_purse_config
}