// Edit place_purse_allocation record
query "place_purse_allocation/{place_purse_allocation_id}" verb=PATCH {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid place_purse_allocation_id?
    uuid event_allocation_id?
    uuid event_purse_allocation_id?
    int place?
    decimal event_pct?
    decimal percentage?
    decimal amount?
  }

  stack {
    // Admin-only mutation
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can update place allocations"
    }
  
    db.get place_purse_allocation {
      field_name = "id"
      field_value = $input.place_purse_allocation_id
    } as $existing
  
    precondition ($existing != null) {
      error_type = "notfound"
      error = "Place allocation not found"
    }
  
    var $resolved_event_allocation_id {
      value = $input.event_purse_allocation_id
    }
  
    conditional {
      if ($resolved_event_allocation_id == null) {
        var.update $resolved_event_allocation_id {
          value = $input.event_allocation_id
        }
      }
    }
  
    var $resolved_event_pct {
      value = $input.percentage
    }
  
    conditional {
      if ($resolved_event_pct == null) {
        var.update $resolved_event_pct {
          value = $input.event_pct
        }
      }
    }
  
    var $next_event_allocation_id {
      value = $existing.event_purse_allocation_id
    }
  
    conditional {
      if ($resolved_event_allocation_id != null) {
        var.update $next_event_allocation_id {
          value = $resolved_event_allocation_id
        }
      }
    }
  
    var $next_place {
      value = $existing.place
    }
  
    conditional {
      if ($input.place != null) {
        var.update $next_place {
          value = $input.place
        }
      }
    }
  
    var $next_event_pct {
      value = $existing.percentage
    }
  
    conditional {
      if ($resolved_event_pct != null) {
        var.update $next_event_pct {
          value = $resolved_event_pct
        }
      }
    }
  
    var $next_amount {
      value = $existing.amount
    }
  
    conditional {
      if ($input.amount != null) {
        var.update $next_amount {
          value = $input.amount
        }
      }
    }
  
    db.edit place_purse_allocation {
      field_name = "id"
      field_value = $input.place_purse_allocation_id
      data = {
        event_purse_allocation_id: $next_event_allocation_id
        place                    : $next_place
        percentage               : $next_event_pct
        amount                   : $next_amount
      }
    } as $place_purse_allocation
  }

  response = $place_purse_allocation
}