table purse_contribution {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
  
    // Prize purse config this contribution belongs to
    uuid config_id?
  
    // User who made the contribution
    int user_id?
  
    // How the contribution was made: ppv_ticket, direct_event, direct_meet, seed
    text source_type?
  
    // Total amount charged to the user
    decimal gross_amount?
  
    // Amount that goes to the prize purse
    decimal purse_amount?
  
    // Square payment ID for the transaction
    text square_payment_id?
  
    // Event allocation targeted by direct contributions
    uuid? event_allocation_id?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "config_id"}]}
    {type: "btree", field: [{name: "user_id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}