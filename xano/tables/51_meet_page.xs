table meet_page {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid meet_id? {
      table = "meet"
    }
  
    text template_key?
    json draft_config?
    json published_config?
    timestamp updated_at?
    timestamp published_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "meet_id"}]}
    {type: "btree", field: [{name: "template_key"}]}
    {type: "btree", field: [{name: "published_at", op: "desc"}]}
    {type: "btree", field: [{name: "updated_at", op: "desc"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}