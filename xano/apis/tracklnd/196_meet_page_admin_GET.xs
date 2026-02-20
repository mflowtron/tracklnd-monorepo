// Get or initialize meet_page for a meet (admin only)
query meet_page_admin verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    // Provide either meet_id or slug
    uuid meet_id?
  
    text slug? filters=trim
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
  
    precondition ($input.meet_id != null || ($input.slug != null && ($input.slug|strlen) > 0)) {
      error_type = "inputerror"
      error = "meet_id or slug is required"
    }
  
    conditional {
      if ($input.meet_id != null) {
        db.get meet {
          field_name = "id"
          field_value = $input.meet_id
        } as $meet
      }
    
      else {
        db.get meet {
          field_name = "slug"
          field_value = $input.slug
        } as $meet
      }
    }
  
    precondition ($meet != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  
    db.get meet_page {
      field_name = "meet_id"
      field_value = $meet.id
    } as $meet_page
  
    conditional {
      if ($meet_page == null) {
        db.add meet_page {
          data = {
            created_at      : "now"
            meet_id         : $meet.id
            template_key    : "blocks_v1"
            draft_config    : {}
            published_config: null
            updated_at      : "now"
          }
        } as $meet_page
      }
    }
  }

  response = $meet_page
}