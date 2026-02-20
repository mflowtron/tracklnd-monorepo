// Add event_purse_allocation record
query event_purse_allocation verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid config_id?
    uuid purse_config_id?
    uuid event_id?
    decimal meet_pct?
    decimal allocation_percentage?
    decimal allocation_amount?
  }

  stack {
    // Admin-only mutation
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can perform this action"
    }
  
    var $resolved_config_id {
      value = $input.purse_config_id
    }
  
    conditional {
      if ($resolved_config_id == null) {
        var.update $resolved_config_id {
          value = $input.config_id
        }
      }
    }
  
    var $resolved_meet_pct {
      value = $input.allocation_percentage
    }
  
    conditional {
      if ($resolved_meet_pct == null) {
        var.update $resolved_meet_pct {
          value = $input.meet_pct
        }
      }
    }
  
    precondition ($resolved_config_id != null) {
      error = "Missing config_id"
    }
  
    precondition ($input.event_id != null) {
      error = "Missing event_id"
    }
  
    db.add event_purse_allocation {
      data = {
        created_at           : "now"
        purse_config_id      : $resolved_config_id
        event_id             : $input.event_id
        allocation_percentage: $resolved_meet_pct
        allocation_amount    : $input.allocation_amount
      }
    } as $event_purse_allocation
  }

  response = $event_purse_allocation
}