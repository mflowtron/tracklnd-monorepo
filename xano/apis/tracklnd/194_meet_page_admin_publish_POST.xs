// Publish draft meet page config (admin only)
query "meet_page_admin/publish" verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid meet_page_id?
  }

  stack {
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can perform this action"
    }
  
    db.get meet_page {
      field_name = "id"
      field_value = $input.meet_page_id
    } as $meet_page
  
    precondition ($meet_page != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  
    db.patch meet_page {
      field_name = "id"
      field_value = $input.meet_page_id
      data = {
        published_config: $meet_page.draft_config
        published_at    : "now"
        updated_at      : "now"
      }
    } as $meet_page
  }

  response = $meet_page
}