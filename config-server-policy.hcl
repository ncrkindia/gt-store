path "secret/*" {
  capabilities = ["read", "list"]
}

path "secret/data/*" {
  capabilities = ["read", "list"]
}
