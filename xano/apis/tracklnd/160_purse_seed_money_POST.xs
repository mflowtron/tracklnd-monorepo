// Add purse_seed_money record
query purse_seed_money verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
    dblink {
      table = "purse_seed_money"
    }
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
  
    db.add purse_seed_money {
      data = {created_at: "now"}
    } as $purse_seed_money
  
    // Recompute snapshot totals (contributions + seed money - refunds)
    db.query purse_contribution {
      where = $db.purse_contribution.config_id == $purse_seed_money.config_id
      return = {type: "list"}
    } as $all_contributions
  
    db.query purse_refund {
      where = $db.purse_refund.config_id == $purse_seed_money.config_id
      return = {type: "list"}
    } as $all_refunds
  
    db.query purse_seed_money {
      where = $db.purse_seed_money.config_id == $purse_seed_money.config_id
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
      field_value = $purse_seed_money.config_id
      data = {
        purse_config_id  : $purse_seed_money.config_id
        total_contributed: $total_contributed
        contributor_count: $contributor_count
        snapshot_at      : "now"
      }
    } as $snapshot
  }

  response = $purse_seed_money
}