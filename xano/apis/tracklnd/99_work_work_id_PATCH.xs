// Edit work record
query "work/{work_id}" verb=PATCH {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid work_id?
    dblink {
      table = "work"
    }
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
  
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    precondition ($raw_input.featured_image_url == null || $raw_input.featured_image_url == "" || ($raw_input.featured_image_url|contains:".n7e.xano.io/")) {
      error_type = "validation"
      error = "Featured image must be a Xano-hosted URL."
    }
  
    precondition ($raw_input.thumbnail_image_url == null || $raw_input.thumbnail_image_url == "" || ($raw_input.thumbnail_image_url|contains:".n7e.xano.io/")) {
      error_type = "validation"
      error = "Thumbnail image must be a Xano-hosted URL."
    }
  
    precondition ($raw_input.work_type == null || $raw_input.work_type == "short" || $raw_input.work_type == "feature") {
      error_type = "validation"
      error = "work_type must be short or feature."
    }
  
    db.patch work {
      field_name = "id"
      field_value = $input.work_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $work
  }

  response = $work
}