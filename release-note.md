# Release Note

## 2024.08.13
Immich's api had changed in v1.107.2!
What you need to fix:
old image url: https://$immich_host/api/asset/file/$pic_id?isThumb=false&isWeb=true&key=$shard_key
new image url: https://$immich_host/api/assets/$pic_id/thumbnail?size=preview&key=$shard_key
