// Upload a file attachment (admin only)
query "upload/attachment" verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
    // File to upload
    file file
  }

  stack {
    // Verify admin role
    db.query user_role {
      where = $db.user_role.user_id == $auth.id && $db.user_role.role == "admin"
      return = {type: "exists"}
    } as $is_admin
  
    precondition ($is_admin) {
      error_type = "accessdenied"
      error = "Only administrators can upload attachments"
    }
  
    storage.create_attachment {
      value = $input.file
      access = "public"
      filename = $input.file.name|first_notempty:"attachment"
    } as $attachment
  }

  response = {
    publicUrl: $attachment.url
    name     : $attachment.name
    size     : $attachment.size
    mime     : $attachment.mime
  }
}