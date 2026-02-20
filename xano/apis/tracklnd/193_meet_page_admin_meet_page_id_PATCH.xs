// Update draft meet page config (admin only)
query "meet_page_admin/{meet_page_id}" verb=PATCH {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid meet_page_id?
    text template_key? filters=trim
    json draft_config?
    dblink {
      table = "meet_page"
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
  
    db.get meet_page {
      field_name = "id"
      field_value = $input.meet_page_id
    } as $meet_page
  
    precondition ($meet_page != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  
    var $patch_data {
      value = {}
    }
  
    conditional {
      if ($raw_input.template_key != null) {
        var.update $patch_data {
          value = $patch_data
            |set:"template_key":($raw_input.template_key|trim)
        }
      }
    }
  
    conditional {
      if ($raw_input.draft_config != null) {
        var.update $patch_data {
          value = $patch_data
            |set:"draft_config":$raw_input.draft_config
        }
      }
    }
  
    var.update $patch_data {
      value = $patch_data|set:"updated_at":"now"
    }
  
    db.patch meet_page {
      field_name = "id"
      field_value = $input.meet_page_id
      data = $patch_data
    } as $meet_page
  }

  response = $meet_page
}