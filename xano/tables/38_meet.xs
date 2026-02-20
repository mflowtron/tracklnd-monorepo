table meet {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    text name?
    text slug?
    text status?
    text description?
    date start_date?
    date end_date?
    text location_name?
    text location_city?
    text location_state?
    text location_country?
    text venue?
    text location?
    text banner_image_url?
    text hero_video_url?
    text thumbnail_image_url?
    text thumbnail_blurhash?
    text broadcast_partner?
    text broadcast_url?
    text cta_label?
    text cta_url?
    bool featured?
    bool published?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "slug"}]}
    {type: "btree", field: [{name: "status"}]}
    {type: "btree", field: [{name: "start_date", op: "desc"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}