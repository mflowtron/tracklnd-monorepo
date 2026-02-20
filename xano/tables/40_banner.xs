table banner {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    text title?
    text subtitle?
    text image_url?
    text image_blurhash?
    text cta_label?
    text cta_url?
    uuid? meet_id? {
      table = "meet"
    }
  
    text link_url?
    text placement?
    int sort_order?
    bool is_active?
    timestamp starts_at?
    timestamp ends_at?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "placement"}]}
    {type: "btree", field: [{name: "is_active"}]}
    {type: "btree", field: [{name: "meet_id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}