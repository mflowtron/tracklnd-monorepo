// Finalize a prize purse: recalculate snapshots and lock the config
query "purse/finalize" verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
    // Prize purse config ID to finalize
    uuid config_id
  }

  stack {
    // Verify admin role
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can finalize a prize purse"
    }
  
    // Fetch config
    db.get prize_purse_config {
      field_name = "id"
      field_value = $input.config_id
    } as $config
  
    precondition ($config != null) {
      error = "Prize purse config not found"
    }
  
    precondition ($config.finalized != true) {
      error = "Prize purse is already finalized"
    }
  
    precondition ($config.contributions_open) {
      error = "Prize purse is not active"
    }
  
    // Recalculate snapshots: contributions + seed money - refunds
    db.query purse_contribution {
      where = $db.purse_contribution.config_id == $input.config_id
      return = {type: "list"}
    } as $contributions
  
    db.query purse_refund {
      where = $db.purse_refund.config_id == $input.config_id
      return = {type: "list"}
    } as $refunds
  
    db.query purse_seed_money {
      where = $db.purse_seed_money.config_id == $input.config_id
      return = {type: "list"}
    } as $seed_money
  
    // Calculate total purse amount
    var $total_purse {
      value = 0
    }
  
    var $contributor_count {
      value = $contributions|count
    }
  
    foreach ($contributions) {
      each as $contrib {
        math.add $total_purse {
          value = $contrib.purse_amount
        }
      }
    }
  
    foreach ($refunds) {
      each as $refund {
        math.sub $total_purse {
          value = $refund.refund_amount
        }
      }
    }
  
    foreach ($seed_money) {
      each as $seed {
        math.add $total_purse {
          value = $seed.amount
        }
      }
    }
  
    // Update or create snapshot
    db.add_or_edit purse_snapshot {
      field_name = "purse_config_id"
      field_value = $input.config_id
      data = {
        purse_config_id  : $input.config_id
        total_contributed: $total_purse
        contributor_count: $contributor_count
        snapshot_at      : "now"
      }
    } as $snapshot
  
    // Lock the purse
    db.edit prize_purse_config {
      field_name = "id"
      field_value = $input.config_id
      data = {
        contributions_open: false
        finalized         : true
        total_purse       : $total_purse
        updated_at        : "now"
      }
    } as $updated_config
  }

  response = {success: true, total_purse: $total_purse}
}