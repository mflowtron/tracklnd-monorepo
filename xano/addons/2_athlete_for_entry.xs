addon athlete_for_entry {
  input {
    uuid athlete_id? {
      table = "athlete"
    }
  }

  stack {
    db.query athlete {
      where = $db.athlete.id == $input.athlete_id
      return = {type: "single"}
    }
  }
}