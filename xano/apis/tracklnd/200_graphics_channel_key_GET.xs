// Public: fetch graphics state by channel key
query "graphics/{channel_key}" verb=GET {
  api_group = "Tracklnd"

  input {
    uuid channel_key
  }

  stack {
    db.get meet_graphics_state {
      field_name = "channel_key"
      field_value = $input.channel_key
    } as $graphics
  
    precondition ($graphics != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  
    var $server_time_ms {
      value = "now"|to_ms
    }
  }

  response = {
    channel_key      : $graphics.channel_key
    state            : $graphics.state
    revision         : $graphics.revision
    serverTimeEpochMs: $server_time_ms
  }
}