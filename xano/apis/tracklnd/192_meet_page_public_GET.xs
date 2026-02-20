// Get published meet page config by meet_id or slug
query meet_page_public verb=GET {
  api_group = "Tracklnd"

  input {
    // Provide either meet_id or slug
    uuid meet_id?
  
    text slug? filters=trim
  }

  stack {
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
        var $response_payload {
          value = null
        }
      }
    
      elseif ($meet_page.published_config == null) {
        var $response_payload {
          value = null
        }
      }
    
      else {
        var $response_payload {
          value = {
            meet_id         : $meet.id
            template_key    : $meet_page.template_key
            published_at    : $meet_page.published_at
            updated_at      : $meet_page.updated_at
            published_config: $meet_page.published_config
          }
        }
      }
    }
  }

  response = $response_payload
}