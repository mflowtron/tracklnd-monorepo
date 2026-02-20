// Fetch Mux video assets (admin only)
query "mux/assets" verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    // Number of assets to return
    int limit?=20
  
    // Page number for pagination
    int page?=1
  }

  stack {
    // Verify admin role
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can access Mux assets"
    }
  
    // Call Mux API
    var $mux_auth {
      value = $env.MUX_TOKEN_ID|concat:$env.MUX_TOKEN_SECRET:":"
    }
  
    api.request {
      url = "https://api.mux.com/video/v1/assets?limit=%s&page=%s"|sprintf:$input.limit:$input.page
      method = "GET"
      headers = []
        |push:("Authorization: Basic %s"
          |sprintf:($mux_auth|base64_encode)
        )
      timeout = 30
    } as $mux_response
  
    // Map to simplified shape
    var $assets {
      value = []
    }
  
    foreach ($mux_response.data) {
      each as $asset {
        var $playback_ids {
          value = []
        }
      
        foreach ($asset.playback_ids) {
          each as $pid {
            array.push $playback_ids {
              value = {id: $pid.id, policy: $pid.policy}
            }
          }
        }
      
        var $thumbnail_url {
          value = null
        }
      
        conditional {
          if ($asset.playback_ids != null && ($asset.playback_ids|count) > 0) {
            var.update $thumbnail_url {
              value = "https://image.mux.com/%s/thumbnail.jpg?width=640&height=360&fit_mode=smartcrop"
                |sprintf:$asset.playback_ids[0].id
            }
          }
        }
      
        array.push $assets {
          value = {
            id           : $asset.id
            status       : $asset.status
            duration     : $asset.duration
            created_at   : $asset.created_at
            playback_ids : $playback_ids
            thumbnail_url: $thumbnail_url
          }
        }
      }
    }
  }

  response = {data: $assets}
}