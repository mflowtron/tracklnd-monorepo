table prize_purse_config {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid meet_id? {
      table = "meet"
    }
  
    decimal total_purse?
    text currency?
    text purse_type?
    bool contributions_open?
    bool finalized?
  
    // When the contribution window opens
    timestamp contributions_open_at?
  
    // When the contribution window closes
    timestamp contributions_close_at?
  
    // Price of a PPV ticket
    decimal ppv_ticket_price?
  
    // How PPV revenue is allocated to purse: static or percentage
    text ppv_purse_mode?
  
    // Static amount from each PPV ticket going to purse
    decimal ppv_purse_static_amount?
  
    // Percentage of PPV ticket price going to purse
    decimal ppv_purse_percentage?
  
    // Number of finish places that receive payouts
    int places_paid?
  
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "meet_id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}