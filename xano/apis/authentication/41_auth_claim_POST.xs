// Claims an imported account (or resets password) using a one-time email token.
query "auth/claim" verb=POST {
  api_group = "Authentication"

  input {
    text magic_token? filters=trim
    email email? filters=trim|lower
    text password? filters=trim|min:8
    text confirm_password? filters=trim
  }

  stack {
    // Check to make sure the magic token exists
    precondition ($input.magic_token != null) {
      error = "magic_token is required but was not provided."
    }
  
    // Check to make sure the email exists
    precondition ($input.email != null) {
      error = "email is required but not provided"
    }
  
    // Check that the password inputs are matching
    precondition ($input.password == $input.confirm_password) {
      error = "Passwords do not match!"
    }
  
    // Get the user record with the email
    db.get user {
      field_name = "email"
      field_value = $input.email
      output = [
        "id"
        "created_at"
        "name"
        "email"
        "password"
        "password_reset.token"
        "password_reset.expiration"
        "password_reset.used"
      ]
    } as $user
  
    precondition ($user != null) {
      error_type = "unauthorized"
      error = "Invalid token"
    }
  
    precondition ($user.password_reset.token != null) {
      error_type = "unauthorized"
      error = "Invalid token"
    }
  
    // Validate the UUID matches the hashed value
    security.check_password {
      text_password = $input.magic_token
      hash_password = $user.password_reset.token
    } as $verify_token
  
    // Verify the UUID validation is true
    precondition ($verify_token) {
      error_type = "unauthorized"
      error = "The token did not match"
    }
  
    // Check that the password reset token has not expired
    precondition ($user.password_reset.expiration > now) {
      error = "Magic token has expired. Please request another one."
    }
  
    // Check to make sure the password reset has not been used
    precondition ($user.password_reset.used == false) {
      error = "This magic link has already been used. Please request another one."
    }
  
    // Update user record with the new password and mark token as used
    db.edit user {
      field_name = "id"
      field_value = $user.id
      data = {
        password      : $input.password
        password_reset: {
        token     : $user.password_reset.token
        expiration: $user.password_reset.expiration
        used      : true
      }
      }
    } as $user1
  
    // Ensure the user has the default viewer role
    db.query user_role {
      where = $db.user_role.user_id == $user.id && $db.user_role.role == "viewer"
      return = {type: "single"}
    } as $viewer_role
  
    conditional {
      if ($viewer_role == null) {
        db.add user_role {
          data = {user_id: $user.id, role: "viewer"}
        } as $viewer_role
      }
    }
  
    // Create an authentication token
    security.create_auth_token {
      table = "user"
      extras = {}
      expiration = 86400
      id = $user.id
    } as $auth_token
  
    // Create an event log for account claim
    function.run create_event_log {
      input = {
        user_id : $user.id
        action  : "claim_account"
        metadata: $user1
      }
    } as $event_log
  }

  response = {authToken: $auth_token, user_id: $user1.id}
}