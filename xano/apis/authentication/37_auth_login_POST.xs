// Login and retrieve an authentication token
query "auth/login" verb=POST {
  api_group = "Authentication"

  input {
    email email? filters=trim|lower
    text password?
  }

  stack {
    // Get the user record via email
    db.get user {
      field_name = "email"
      field_value = $input.email
      output = ["id", "created_at", "name", "email", "password"]
    } as $user
  
    // Check to make sure a user with that email exists
    precondition ($user != null) {
      error_type = "accessdenied"
      error = "Invalid Credentials."
    }
  
    // Imported users may not have a password yet.
    // In that case, email a one-time link to claim the account.
    conditional {
      if ($user.password == null || $user.password == "") {
        precondition ($env.RESEND_API_KEY != null && $env.RESEND_FROM_EMAIL != null && $env.PUBLIC_WEB_URL != null) {
          error_type = "accessdenied"
          error = "Account activation is not available. Please contact support."
        }
      
        var $is_rate_limited {
          value = false
        }
      
        var $window_bucket {
          value = (("now"|to_ms)|div:60000)|to_int
        }
      
        var $rate_key {
          value = "%s:%s:%s"
            |sprintf:$input.email:"auth/request-reset":$window_bucket
        }
      
        db.query api_rate_limit {
          where = $db.api_rate_limit.rate_key == $rate_key
          return = {type: "single"}
        } as $rate_limit
      
        conditional {
          if ($rate_limit == null) {
            db.add api_rate_limit {
              data = {
                rate_key     : $rate_key
                user_id      : $user.id
                endpoint     : "auth/request-reset"
                window_bucket: $window_bucket
                hit_count    : 1
                request_id   : null
                created_at   : "now"
                updated_at   : "now"
              }
            } as $rate_limit
          }
        
          else {
            conditional {
              if ($rate_limit.hit_count >= 3) {
                var.update $is_rate_limited {
                  value = true
                }
              }
            
              else {
                var $next_hit_count {
                  value = $rate_limit.hit_count
                }
              
                math.add $next_hit_count {
                  value = 1
                }
              
                db.edit api_rate_limit {
                  field_name = "id"
                  field_value = $rate_limit.id
                  data = {hit_count: $next_hit_count, updated_at: "now"}
                } as $rate_limit
              }
            }
          }
        }
      
        conditional {
          if ($is_rate_limited == false) {
            function.run generate_magic_link {
              input = {email: $input.email}
            } as $token_and_email
          
            var $encoded_email {
              value = $token_and_email.email|url_encode_rfc3986
            }
          
            var $magic_link {
              value = $env.PUBLIC_WEB_URL ~ "/update-password" ~ "?magic_token=" ~ $token_and_email.token ~ "&email=" ~ $encoded_email
            }
          
            util.template_engine {
              value = """
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset=\"utf-8\">
                    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
                    <title>Finish signing in</title>
                  </head>
                  <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #111;\">
                    <div style=\"max-width: 640px; margin: 24px auto; padding: 16px 18px; border: 1px solid #e5e5e5; border-radius: 10px;\">
                      <h2 style=\"margin: 0 0 12px;\">Finish signing in to Tracklnd</h2>
                      <p style=\"margin: 0 0 12px;\">Click the button below to set your password and access your account. This link expires in 60 minutes.</p>
                      <p style=\"text-align: center; margin: 18px 0 16px;\">
                        <a href=\"{{ $var.magic_link }}\" style=\"display: inline-block; padding: 12px 18px; background: #1d4ed8; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;\">Set Password</a>
                      </p>
                      <p style=\"margin: 0; color: #555; font-size: 13px;\">If you didn't request this email, you can safely ignore it.</p>
                    </div>
                  </body>
                  </html>
                """
            } as $message
          
            util.send_email {
              api_key = $env.RESEND_API_KEY
              service_provider = "resend"
              subject = "Finish signing in to Tracklnd"
              message = $message
              to = $token_and_email.email
              from = $env.RESEND_FROM_EMAIL
              reply_to = $env.RESEND_FROM_EMAIL
            } as $send_email
          
            function.run create_event_log {
              input = {
                user_id : $user.id
                action  : "auth_request_reset"
                metadata: {}
              }
            } as $event_log
          }
        }
      
        precondition (false) {
          error_type = "accessdenied"
          error = "Check your email to finish signing in."
        }
      }
    }
  
    // Check that the password matches the hashed password
    security.check_password {
      text_password = $input.password
      hash_password = $user.password
    } as $pass_result
  
    // Verify that the password check passed
    precondition ($pass_result) {
      error_type = "accessdenied"
      error = "Invalid Credentials."
    }
  
    // Create an authentication token
    security.create_auth_token {
      table = "user"
      extras = {}
      expiration = 86400
      id = $user.id
    } as $authToken
  
    // Create an event log for login
    function.run create_event_log {
      input = {user_id: $user.id, action: "login", metadata: $user}
    } as $event_log
  }

  response = {authToken: $authToken, user_id: $user.id}
}