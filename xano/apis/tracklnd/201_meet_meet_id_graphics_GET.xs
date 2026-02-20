// Admin: get or initialize graphics state for a meet
query "meet/{meet_id}/graphics" verb=GET {
  api_group = "Tracklnd"
  auth = "user"

  input {
    uuid meet_id
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
  
    db.get meet {
      field_name = "id"
      field_value = $input.meet_id
    } as $meet
  
    precondition ($meet != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  
    var $now_ms {
      value = "now"|to_ms
    }
  
    db.get meet_graphics_state {
      field_name = "meet_id"
      field_value = $meet.id
    } as $graphics
  
    conditional {
      if ($graphics == null) {
        security.create_uuid as $channel_key
      
        // Default state is intentionally minimal; use the Control Panel to load demo data.
        var $default_state {
          value = {
            scene : {showHeader: true, showTicker: true, showTimer: true, showPurse: true}
            header: {meetName: $meet.name|first_notnull:"", eventName: "", heatLabel: "", logoUrl: ""}
            ticker: {
              enabled: true
              speedPxPerSec: 120
              paused: false
              prev: {label: "Prev Results", items: []}
              next: {label: "Next Up", names: []}
            }
            timer : {mode: "clock", race: {running: false, startEpochMs: null, elapsedMs: 0, lapCurrent: 0, lapTotal: 0}}
            purse : {valueCents: 0, lastChangedEpochMs: $now_ms}
          }
        }
      
        db.add meet_graphics_state {
          data = {
            created_at : "now"
            updated_at : "now"
            meet_id    : $meet.id
            channel_key: $channel_key
            revision   : 1
            state      : $default_state
          }
        } as $graphics
      }
    }
  }

  response = $graphics|set:"serverTimeEpochMs":$now_ms
}