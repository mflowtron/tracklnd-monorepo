// Add place_purse_allocation record
query place_purse_allocation verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
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
      error = "Only administrators can perform this action"
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
  
    precondition ($resolved_event_allocation_id != null) {
      error = "Missing event_allocation_id"
    }
  
    precondition ($input.place != null) {
      error = "Missing place"
    }
  
    db.add place_purse_allocation {
      data = {
        created_at               : "now"
        event_purse_allocation_id: $resolved_event_allocation_id
        place                    : $input.place
        percentage               : $resolved_event_pct
        amount                   : $input.amount
      }
    } as $place_purse_allocation
  }

  response = $place_purse_allocation
}