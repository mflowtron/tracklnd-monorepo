table purse_refund {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
  
    // Prize purse config this refund belongs to
    uuid config_id?
  
    // Contribution being refunded
    uuid contribution_id?
  
    // Amount refunded
    decimal refund_amount?
  
    // Square refund ID for the transaction
    text square_refund_id?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "config_id"}]}
    {type: "btree", field: [{name: "contribution_id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}