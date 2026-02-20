// Query all purse_snapshot records
query purse_snapshot verb=GET {
  api_group = "Tracklnd"

  input {
    int limit?=100
    int page?=1
  
    // Filter by prize purse config ID
    uuid config_id?
  }

  stack {
    var $response_payload {
      value = []
    }
  
    conditional {
      if ($input.config_id != null) {
        db.query purse_snapshot {
          where = $db.purse_snapshot.purse_config_id == $input.config_id
          return = {type: "single"}
        } as $snapshot_row
      
        db.query event_purse_allocation {
          where = $db.event_purse_allocation.purse_config_id == $input.config_id
          return = {type: "list"}
        } as $event_allocations
      
        var $total_contributed {
          value = 0
        }
      
        var $contributor_count {
          value = 0
        }
      
        var $snapshot_id {
          value = $input.config_id
        }
      
        var $snapshot_created_at {
          value = "now"
        }
      
        var $snapshot_at {
          value = "now"
        }
      
        conditional {
          if ($snapshot_row != null) {
            var.update $total_contributed {
              value = $snapshot_row.total_contributed
            }
          
            var.update $contributor_count {
              value = $snapshot_row.contributor_count
            }
          
            var.update $snapshot_id {
              value = $snapshot_row.id
            }
          
            var.update $snapshot_created_at {
              value = $snapshot_row.created_at
            }
          
            var.update $snapshot_at {
              value = $snapshot_row.snapshot_at
            }
          }
        }
      
        var $event_totals {
          value = []
        }
      
        var $place_totals {
          value = []
        }
      
        foreach ($event_allocations) {
          each as $event_allocation {
            var $event_percentage {
              value = 0
            }
          
            conditional {
              if ($event_allocation.allocation_percentage != null) {
                var.update $event_percentage {
                  value = $event_allocation.allocation_percentage
                }
              }
            
              elseif ($event_allocation.meet_pct != null) {
                var.update $event_percentage {
                  value = $event_allocation.meet_pct
                }
              }
            }
          
            var $event_amount {
              value = 0
            }
          
            conditional {
              if ($event_allocation.allocation_percentage != null || $event_allocation.meet_pct != null) {
                var.update $event_amount {
                  value = $total_contributed
                }
              
                math.mul $event_amount {
                  value = $event_percentage
                }
              
                math.div $event_amount {
                  value = 100
                }
              }
            
              elseif ($event_allocation.allocation_amount != null) {
                var.update $event_amount {
                  value = $event_allocation.allocation_amount
                }
              }
            }
          
            var.update $event_totals {
              value = $event_totals
                |push:```
                  {
                    event_allocation_id: $event_allocation.id
                    event_id           : $event_allocation.event_id
                    percentage         : $event_percentage
                    total              : $event_amount
                  }
                  ```
            }
          
            db.query place_purse_allocation {
              where = $db.place_purse_allocation.event_purse_allocation_id == $event_allocation.id
              return = {type: "list"}
            } as $event_places
          
            foreach ($event_places) {
              each as $place_allocation {
                var $place_percentage {
                  value = 0
                }
              
                conditional {
                  if ($place_allocation.percentage != null) {
                    var.update $place_percentage {
                      value = $place_allocation.percentage
                    }
                  }
                
                  elseif ($place_allocation.event_pct != null) {
                    var.update $place_percentage {
                      value = $place_allocation.event_pct
                    }
                  }
                }
              
                var $place_amount {
                  value = 0
                }
              
                conditional {
                  if ($place_allocation.percentage != null || $place_allocation.event_pct != null) {
                    var.update $place_amount {
                      value = $event_amount
                    }
                  
                    math.mul $place_amount {
                      value = $place_percentage
                    }
                  
                    math.div $place_amount {
                      value = 100
                    }
                  }
                
                  elseif ($place_allocation.amount != null) {
                    var.update $place_amount {
                      value = $place_allocation.amount
                    }
                  }
                }
              
                var.update $place_totals {
                  value = $place_totals
                    |push:```
                      {
                        place_allocation_id: $place_allocation.id
                        event_allocation_id: $event_allocation.id
                        event_id           : $event_allocation.event_id
                        place              : $place_allocation.place
                        percentage         : $place_percentage
                        total              : $place_amount
                      }
                      ```
                }
              }
            }
          }
        }
      
        var.update $response_payload {
          value = {
            id               : $snapshot_id
            purse_config_id  : $input.config_id
            total_contributed: $total_contributed
            contributor_count: $contributor_count
            snapshot_at      : $snapshot_at
            created_at       : $snapshot_created_at
            event_totals     : $event_totals
            place_totals     : $place_totals
          }
        }
      }
    
      else {
        db.query purse_snapshot {
          where = $db.purse_snapshot.purse_config_id ==? $input.config_id
          return = {
            type  : "list"
            paging: {page: $input.page, per_page: $input.limit}
          }
        } as $purse_snapshot_rows
      
        var.update $response_payload {
          value = $purse_snapshot_rows.items
        }
      }
    }
  }

  response = $response_payload
  cache = {
    ttl       : 10
    input     : true
    auth      : true
    datasource: true
    ip        : false
    headers   : []
    env       : []
  }
}