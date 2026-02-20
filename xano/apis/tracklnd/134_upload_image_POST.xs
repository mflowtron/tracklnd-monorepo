query "upload/image" verb=POST {
  api_group = "Tracklnd"
  auth = "user"

  input {
    // Image file to upload (max 5MB)
    image file
  }

  stack {
    // Store the image in Xano's public storage
    storage.create_image {
      value = $input.file
      access = "public"
    } as $image_metadata
  }

  response = {publicUrl: $image_metadata.url}
}