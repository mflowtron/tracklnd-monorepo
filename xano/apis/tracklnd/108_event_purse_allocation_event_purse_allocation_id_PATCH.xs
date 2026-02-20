// Edit event_purse_allocation record
query "event_purse_allocation/{event_purse_allocation_id}" verb=PATCH {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid event_purse_allocation_id?
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
      error = "Only administrators can update event allocations"
    }
  
    db.get event_purse_allocation {
      field_name = "id"
      field_value = $input.event_purse_allocation_id
    } as $existing
  
    precondition ($existing != null) {
      error_type = "notfound"
      error = "Event allocation not found"
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
  
    var $next_config_id {
      value = $existing.purse_config_id
    }
  
    conditional {
      if ($resolved_config_id != null) {
        var.update $next_config_id {
          value = $resolved_config_id
        }
      }
    }
  
    var $next_event_id {
      value = $existing.event_id
    }
  
    conditional {
      if ($input.event_id != null) {
        var.update $next_event_id {
          value = $input.event_id
        }
      }
    }
  
    var $next_meet_pct {
      value = $existing.allocation_percentage
    }
  
    conditional {
      if ($resolved_meet_pct != null) {
        var.update $next_meet_pct {
          value = $resolved_meet_pct
        }
      }
    }
  
    var $next_allocation_amount {
      value = $existing.allocation_amount
    }
  
    conditional {
      if ($input.allocation_amount != null) {
        var.update $next_allocation_amount {
          value = $input.allocation_amount
        }
      }
    }
  
    db.edit event_purse_allocation {
      field_name = "id"
      field_value = $input.event_purse_allocation_id
      data = {
        purse_config_id      : $next_config_id
        event_id             : $next_event_id
        allocation_percentage: $next_meet_pct
        allocation_amount    : $next_allocation_amount
      }
    } as $event_purse_allocation
  }

  response = $event_purse_allocation
}