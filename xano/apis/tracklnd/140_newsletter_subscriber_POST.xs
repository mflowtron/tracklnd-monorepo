// Add newsletter_subscriber record
query newsletter_subscriber verb=POST {
  api_group = "Tracklnd"

  input {
    dblink {
      table = "newsletter_subscriber"
    }
  }

  stack {
    // Public newsletter opt-in
    db.add newsletter_subscriber {
      data = {created_at: "now"}
    } as $newsletter_subscriber
  }

  response = $newsletter_subscriber
}