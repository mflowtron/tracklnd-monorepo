table broadcast {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid meet_id? {
      table = "meet"
    }
  
    text title?
    text mux_playback_id?
    text mux_stream_key?
    text mux_asset_id?
    text stream_url?
    text status?
    bool is_active?
    timestamp started_at?
    timestamp ended_at?
    int viewer_count?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "meet_id"}]}
    {type: "btree", field: [{name: "is_active"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}