// Process a refund for a purse contribution via Square
query "payment/process-refund" verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
    // ID of the purse contribution to refund
    uuid contribution_id
  
    // Optional request correlation ID from the client
    text request_id?
  }

  stack {
    // Validate Square credentials
    precondition ($env.SQUARE_ACCESS_TOKEN != null) {
      error = "Square credentials not configured"
    }
  
    // Fetch contribution
    db.get purse_contribution {
      field_name = "id"
      field_value = $input.contribution_id
    } as $contribution
  
    precondition ($contribution != null) {
      error = "Contribution not found"
    }
  
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($contribution.user_id == $auth.id || $is_admin) {
      error_type = "accessdenied"
      error = "You do not have permission to refund this contribution"
    }
  
    // Use caller-provided request ID when available, otherwise generate one.
    var $request_id {
      value = $input.request_id
    }
  
    conditional {
      if ($request_id == null || $request_id == "") {
        security.create_uuid as $generated_request_id
        var.update $request_id {
          value = $generated_request_id
        }
      }
    }
  
    // Rate limit refund attempts: max 3 per user per minute.
    var $window_bucket {
      value = (("now"|to_ms)|div:60000)|to_int
    }
  
    var $rate_key {
      value = "%s:%s:%s"
        |sprintf:$auth.id:"payment/process-refund":$window_bucket
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
            user_id      : $auth.id
            endpoint     : "payment/process-refund"
            window_bucket: $window_bucket
            hit_count    : 1
            request_id   : $request_id
            created_at   : "now"
            updated_at   : "now"
          }
        } as $rate_limit
      }
    
      else {
        precondition ($rate_limit.hit_count < 3) {
          error = "Too many refund attempts. Please wait a minute and try again."
        }
      
        var $next_hit_count {
          value = $rate_limit.hit_count
        }
      
        math.add $next_hit_count {
          value = 1
        }
      
        db.edit api_rate_limit {
          field_name = "id"
          field_value = $rate_limit.id
          data = {
            hit_count : $next_hit_count
            request_id: $request_id
            updated_at: "now"
          }
        } as $rate_limit
      }
    }
  
    // Fetch config for refund window check
    db.get prize_purse_config {
      field_name = "id"
      field_value = $contribution.config_id
    } as $config
  
    // Check refund window
    conditional {
      if ($config.contributions_close_at != null && ("now"|to_ms) > ($config.contributions_close_at|to_ms)) {
        throw {
          name = "ValidationError"
          value = "Refund window has closed. Contributions are locked."
        }
      }
    }
  
    // Check for existing refund
    db.query purse_refund {
      where = $db.purse_refund.contribution_id == $input.contribution_id
      return = {type: "exists"}
    } as $already_refunded
  
    precondition ($already_refunded == false) {
      error = "Already refunded"
    }
  
    // Call Square Refunds API
    security.create_uuid as $idempotency_key
  
    var $charge_cents {
      value = $contribution.gross_amount
    }
  
    math.mul $charge_cents {
      value = 100
    }
  
    // Determine Square API base URL (sandbox vs production)
    var $square_base_url {
      value = "https://connect.squareup.com"
    }
  
    conditional {
      if ($env.SQUARE_ENVIRONMENT == "sandbox") {
        var.update $square_base_url {
          value = "https://connect.squareupsandbox.com"
        }
      }
    }
  
    var $square_url {
      value = "%s/v2/refunds"|sprintf:$square_base_url
    }
  
    api.request {
      url = $square_url
      method = "POST"
      params = {}
        |set:"idempotency_key":$idempotency_key
        |set:"payment_id":$contribution.square_payment_id
        |set:"amount_money":({}
          |set:"amount":$charge_cents
          |set:"currency":"USD"
        )
      headers = []
        |push:"Square-Version: 2024-01-18"
        |push:("Authorization: Bearer %s"|sprintf:$env.SQUARE_ACCESS_TOKEN)
        |push:"Content-Type: application/json"
      timeout = 30
    } as $square_response
  
    // Normalize Square response shape across Xano environments.
    var $square_result {
      value = $square_response.response.result
    }
  
    conditional {
      if ($square_result == null) {
        var.update $square_result {
          value = $square_response
        }
      }
    }
  
    precondition ($square_result.refund != null) {
      error = "Square refund failed"
    }
  
    // Insert refund record
    db.add purse_refund {
      data = {
        config_id       : $contribution.config_id
        contribution_id : $input.contribution_id
        refund_amount   : $contribution.gross_amount
        square_refund_id: $square_result.refund.id
        created_at      : "now"
      }
    } as $refund
  
    // Recompute snapshot totals so all read paths stay consistent.
    db.query purse_contribution {
      where = $db.purse_contribution.config_id == $contribution.config_id
      return = {type: "list"}
    } as $all_contributions
  
    db.query purse_refund {
      where = $db.purse_refund.config_id == $contribution.config_id
      return = {type: "list"}
    } as $all_refunds
  
    db.query purse_seed_money {
      where = $db.purse_seed_money.config_id == $contribution.config_id
      return = {type: "list"}
    } as $all_seed_money
  
    var $total_contributed {
      value = 0
    }
  
    var $contributor_count {
      value = $all_contributions|count
    }
  
    foreach ($all_contributions) {
      each as $item {
        math.add $total_contributed {
          value = $item.purse_amount
        }
      }
    }
  
    foreach ($all_refunds) {
      each as $item {
        math.sub $total_contributed {
          value = $item.refund_amount
        }
      }
    }
  
    foreach ($all_seed_money) {
      each as $item {
        math.add $total_contributed {
          value = $item.amount
        }
      }
    }
  
    db.add_or_edit purse_snapshot {
      field_name = "purse_config_id"
      field_value = $contribution.config_id
      data = {
        purse_config_id  : $contribution.config_id
        total_contributed: $total_contributed
        contributor_count: $contributor_count
        snapshot_at      : "now"
      }
    } as $snapshot
  
    // For PPV tickets: revoke meet access
    conditional {
      if ($contribution.source_type == "ppv_ticket") {
        db.query user_meet_access {
          where = $db.user_meet_access.user_id == $contribution.user_id && $db.user_meet_access.meet_id == $config.meet_id
          return = {type: "single"}
        } as $access_record
      
        conditional {
          if ($access_record != null) {
            db.edit user_meet_access {
              field_name = "id"
              field_value = $access_record.id
              data = {revoked_at: "now"}
            } as $revoked_access
          }
        }
      }
    }
  }

  response = {success: true, request_id: $request_id}
}