// Process a Square card payment for PPV ticket or direct contribution
query "payment/process-square" verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
    // Square card nonce from frontend tokenization
    text nonce
  
    // Prize purse config ID
    uuid config_id
  
    // Payment type: ppv or direct
    text payment_type
  
    // Event allocation ID for direct event contributions
    uuid event_allocation_id?
  
    // Amount for direct contributions (required when payment_type=direct)
    decimal amount?
  
    // Optional request correlation ID from the client
    text request_id?
  }

  stack {
    // Validate Square credentials
    precondition ($env.SQUARE_ACCESS_TOKEN != null) {
      error = "Square credentials not configured"
    }
  
    // Validate payment_type
    precondition ($input.payment_type == "ppv" || $input.payment_type == "direct") {
      error = "payment_type must be ppv or direct"
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
  
    // Rate limit payment attempts: max 6 per user per minute.
    var $window_bucket {
      value = (("now"|to_ms)|div:60000)|to_int
    }
  
    var $rate_key {
      value = "%s:%s:%s"
        |sprintf:$auth.id:"payment/process-square":$window_bucket
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
            endpoint     : "payment/process-square"
            window_bucket: $window_bucket
            hit_count    : 1
            request_id   : $request_id
            created_at   : "now"
            updated_at   : "now"
          }
        } as $rate_limit
      }
    
      else {
        precondition ($rate_limit.hit_count < 6) {
          error = "Too many payment attempts. Please wait a minute and try again."
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
  
    // Fetch config
    db.get prize_purse_config {
      field_name = "id"
      field_value = $input.config_id
    } as $config
  
    precondition ($config != null) {
      error = "Prize purse config not found"
    }
  
    precondition ($config.contributions_open) {
      error = "Prize purse is not active"
    }
  
    precondition ($config.finalized != true) {
      error = "Prize purse has been finalized"
    }
  
    // Enforce contribution window
    conditional {
      if ($config.contributions_open_at != null && ("now"|to_ms) < ($config.contributions_open_at|to_ms)) {
        throw {
          name = "ValidationError"
          value = "Contributions not yet open"
        }
      }
    }
  
    conditional {
      if ($config.contributions_close_at != null && ("now"|to_ms) > ($config.contributions_close_at|to_ms)) {
        throw {
          name = "ValidationError"
          value = "Contribution window has closed"
        }
      }
    }
  
    // Determine charge amount and purse amount
    var $charge_amount {
      value = 0
    }
  
    var $purse_amount {
      value = 0
    }
  
    conditional {
      if ($input.payment_type == "ppv") {
        var.update $charge_amount {
          value = $config.ppv_ticket_price
        }
      
        conditional {
          if ($config.ppv_purse_mode == "static") {
            var.update $purse_amount {
              value = $config.ppv_purse_static_amount
            }
          }
        
          else {
            // percentage mode
            var.update $purse_amount {
              value = $config.ppv_ticket_price
            }
          
            math.mul $purse_amount {
              value = $config.ppv_purse_percentage
            }
          
            math.div $purse_amount {
              value = 100
            }
          }
        }
      }
    
      else {
        // Direct contribution
        precondition ($input.amount != null && $input.amount > 0) {
          error = "Amount is required for direct contributions"
        }
      
        var.update $charge_amount {
          value = $input.amount
        }
      
        var.update $purse_amount {
          value = $input.amount
        }
      }
    }
  
    precondition ($purse_amount >= 2) {
      error = "Minimum purse contribution is $2.00"
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
  
    // Call Square Payments API
    security.create_uuid as $idempotency_key
  
    // Convert to integer cents (Square requires integer amount)
    var $charge_cents {
      value = ($charge_amount|mul:100)|to_int
    }
  
    var $square_url {
      value = "%s/v2/payments"|sprintf:$square_base_url
    }
  
    api.request {
      url = $square_url
      method = "POST"
      params = {}
        |set:"source_id":$input.nonce
        |set:"idempotency_key":$idempotency_key
        |set:"amount_money":({}
          |set:"amount":$charge_cents
          |set:"currency":"USD"
        )
        |set:"location_id":$env.SQUARE_LOCATION_ID
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
  
    precondition ($square_result.payment != null) {
      error = "Square payment failed"
    }
  
    var $payment_id {
      value = $square_result.payment.id
    }
  
    // Determine source_type and resolve event_allocation_id
    var $source_type {
      value = "direct_meet"
    }
  
    var $alloc_id {
      value = null
    }
  
    conditional {
      if ($input.payment_type == "ppv") {
        var.update $source_type {
          value = "ppv_ticket"
        }
      }
    
      elseif ($input.event_allocation_id != null && $input.event_allocation_id != "") {
        var.update $source_type {
          value = "direct_event"
        }
      
        var.update $alloc_id {
          value = $input.event_allocation_id
        }
      }
    }
  
    // Insert contribution — always include event_allocation_id explicitly (null for PPV/direct_meet)
    db.add purse_contribution {
      data = {
        config_id          : $input.config_id
        source_type        : $source_type
        user_id            : $auth.id
        gross_amount       : $charge_amount
        purse_amount       : $purse_amount
        square_payment_id  : $payment_id
        event_allocation_id: $alloc_id
        created_at         : "now"
      }
    } as $contribution
  
    // Update purse snapshot with fully recomputed totals
    db.query purse_contribution {
      where = $db.purse_contribution.config_id == $input.config_id
      return = {type: "list"}
    } as $all_contributions
  
    db.query purse_refund {
      where = $db.purse_refund.config_id == $input.config_id
      return = {type: "list"}
    } as $all_refunds
  
    db.query purse_seed_money {
      where = $db.purse_seed_money.config_id == $input.config_id
      return = {type: "list"}
    } as $all_seed_money
  
    var $total_contributed {
      value = 0
    }
  
    var $contributor_count {
      value = $all_contributions|count
    }
  
    foreach ($all_contributions) {
      each as $c {
        math.add $total_contributed {
          value = $c.purse_amount
        }
      }
    }
  
    foreach ($all_refunds) {
      each as $refund {
        math.sub $total_contributed {
          value = $refund.refund_amount
        }
      }
    }
  
    foreach ($all_seed_money) {
      each as $seed {
        math.add $total_contributed {
          value = $seed.amount
        }
      }
    }
  
    db.add_or_edit purse_snapshot {
      field_name = "purse_config_id"
      field_value = $input.config_id
      data = {
        purse_config_id  : $input.config_id
        total_contributed: $total_contributed
        contributor_count: $contributor_count
        snapshot_at      : "now"
      }
    } as $snapshot
  
    // For PPV: grant meet access (query existing, then update or insert)
    conditional {
      if ($input.payment_type == "ppv") {
        db.query user_meet_access {
          where = $db.user_meet_access.user_id == $auth.id && $db.user_meet_access.meet_id == $config.meet_id
          return = {type: "single"}
        } as $existing_access
      
        conditional {
          if ($existing_access != null) {
            // Re-grant after previous refund
            db.edit user_meet_access {
              field_name = "id"
              field_value = $existing_access.id
              data = {
                access_type      : "ppv"
                square_payment_id: $payment_id
                granted_at       : "now"
                revoked_at       : null
              }
            } as $access
          }
        
          else {
            db.add user_meet_access {
              data = {
                user_id          : $auth.id
                meet_id          : $config.meet_id
                access_type      : "ppv"
                square_payment_id: $payment_id
                granted_at       : "now"
                revoked_at       : null
              }
            } as $access
          }
        }
      }
    }
  }

  response = {
    success   : true
    payment_id: $payment_id
    request_id: $request_id
  }
}