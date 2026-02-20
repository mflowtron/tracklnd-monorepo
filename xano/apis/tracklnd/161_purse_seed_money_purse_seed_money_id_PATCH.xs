// Edit purse_seed_money record
query "purse_seed_money/{purse_seed_money_id}" verb=PATCH {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid purse_seed_money_id?
    dblink {
      table = "purse_seed_money"
    }
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
    } as $existing_seed
  
    precondition ($existing_seed != null) {
      error_type = "notfound"
      error = "Seed money record not found"
    }
  
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch purse_seed_money {
      field_name = "id"
      field_value = $input.purse_seed_money_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $purse_seed_money
  
    // Recompute snapshot for the updated config
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
  
    // If the config target moved, also recalc the previous config
    conditional {
      if ($existing_seed.config_id != $purse_seed_money.config_id) {
        db.query purse_contribution {
          where = $db.purse_contribution.config_id == $existing_seed.config_id
          return = {type: "list"}
        } as $old_contributions
      
        db.query purse_refund {
          where = $db.purse_refund.config_id == $existing_seed.config_id
          return = {type: "list"}
        } as $old_refunds
      
        db.query purse_seed_money {
          where = $db.purse_seed_money.config_id == $existing_seed.config_id
          return = {type: "list"}
        } as $old_seed_money
      
        var $old_total_contributed {
          value = 0
        }
      
        var $old_contributor_count {
          value = $old_contributions|count
        }
      
        foreach ($old_contributions) {
          each as $item {
            math.add $old_total_contributed {
              value = $item.purse_amount
            }
          }
        }
      
        foreach ($old_refunds) {
          each as $item {
            math.sub $old_total_contributed {
              value = $item.refund_amount
            }
          }
        }
      
        foreach ($old_seed_money) {
          each as $item {
            math.add $old_total_contributed {
              value = $item.amount
            }
          }
        }
      
        db.add_or_edit purse_snapshot {
          field_name = "purse_config_id"
          field_value = $existing_seed.config_id
          data = {
            purse_config_id  : $existing_seed.config_id
            total_contributed: $old_total_contributed
            contributor_count: $old_contributor_count
            snapshot_at      : "now"
          }
        } as $old_snapshot
      }
    }
  }

  response = $purse_seed_money
}