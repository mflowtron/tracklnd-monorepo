table work {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    text title?
    text slug?
    text subtitle?
    text body?
  
    // Editor.js output data (blocks JSON)
    json? body_json?
  
    text excerpt?
    enum work_type? {
      values = ["short", "feature"]
    }
  
    text status?
    text featured_image_url?
    text thumbnail_image_url?
    text thumbnail_blurhash?
    int author_id? {
      table = "user"
    }
  
    uuid? meet_id? {
      table = "meet"
    }
  
    timestamp published_at?
    text[] tags?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "slug"}]}
    {type: "btree", field: [{name: "status"}]}
    {type: "btree", field: [{name: "published_at", op: "desc"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}