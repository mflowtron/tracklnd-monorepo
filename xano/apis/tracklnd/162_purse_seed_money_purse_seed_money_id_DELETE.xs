// Delete purse_seed_money record
query "purse_seed_money/{purse_seed_money_id}" verb=DELETE {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid purse_seed_money_id?
  }

  stack {
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can perform this action"
    }
  
    db.get purse_seed_money {
      field_name = "id"
      field_value = $input.purse_seed_money_id
    } as $seed_record
  
    precondition ($seed_record != null) {
      error_type = "notfound"
      error = "Seed money record not found"
    }
  
    db.del purse_seed_money {
      field_name = "id"
      field_value = $input.purse_seed_money_id
    }
  
    // Recompute snapshot totals after deletion
    db.query purse_contribution {
      where = $db.purse_contribution.config_id == $seed_record.config_id
      return = {type: "list"}
    } as $all_contributions
  
    db.query purse_refund {
      where = $db.purse_refund.config_id == $seed_record.config_id
      return = {type: "list"}
    } as $all_refunds
  
    db.query purse_seed_money {
      where = $db.purse_seed_money.config_id == $seed_record.config_id
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
      field_value = $seed_record.config_id
      data = {
        purse_config_id  : $seed_record.config_id
        total_contributed: $total_contributed
        contributor_count: $contributor_count
        snapshot_at      : "now"
      }
    } as $snapshot
  }

  response = null
}