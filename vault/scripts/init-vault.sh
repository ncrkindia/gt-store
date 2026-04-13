#!/bin/sh

# 1. Start Vault server in the background
echo "Starting Vault server..."
vault server -config=/vault/config/vault.hcl &
VAULT_PID=$!

# Wait for Vault to start
echo "Waiting for Vault to start..."
sleep 5

# 2. Check if Vault is initialized
if ! vault operator init -status > /dev/null 2>&1; then
    echo "Vault is not initialized. Initializing now..."
    # Initialize Vault and capture the output
    # We use -key-shares=1 and -key-threshold=1 for local dev convenience
    vault operator init -key-shares=1 -key-threshold=1 > /vault/data/init.txt
    echo "Vault initialized. Keys saved to /vault/data/init.txt"
fi

# 3. Perform unseal
UNSEAL_KEY=$(grep "Unseal Key 1:" /vault/data/init.txt | cut -d' ' -f4)
if [ -n "$UNSEAL_KEY" ]; then
    echo "Unsealing Vault..."
    vault operator unseal "$UNSEAL_KEY"
else
    echo "Error: Unseal Key not found in /vault/data/init.txt"
    exit 1
fi

# 4. Check if we need to re-seed (AppRole and Secrets)
ROOT_TOKEN=$(grep "Initial Root Token:" /vault/data/init.txt | cut -d' ' -f4)
export VAULT_TOKEN=$ROOT_TOKEN
export VAULT_ADDR='http://127.0.0.1:8200'

if ! vault policy read config-server > /dev/null 2>&1; then
    echo "Fresh setup detected. Re-seeding AppRole and Secrets..."
    
    # Enable KV-V2 secrets engine
    vault secrets enable -path=secret kv-v2 || true

    # Enable AppRole
    vault auth enable approle || true
    
    # Seed Secrets Data
    vault kv put secret/application \
        NOTIFICATION_CC="$NOTIFICATION_CC" \
        RAZORPAY_KEY_SECRET="$RAZORPAY_KEY_SECRET" \
        SMTP_PASSWORD="$SMTP_PASSWORD"

    # Write Policy
    vault policy write config-server - <<EOF
path "secret/*" {
  capabilities = ["read", "list"]
}
path "secret/data/*" {
  capabilities = ["read", "list"]
}
EOF

    # Create Role with FIXED RoleID to match .env
    vault write auth/approle/role/config-server \
        token_policies="config-server" \
        token_ttl=1h \
        token_max_ttl=4h
    
    # Set the specific RoleID from .env to avoid breakage
    vault write auth/approle/role/config-server/role-id \
        role_id="$VAULT_ROLE_ID"
    
    # Set the specific SecretID from .env
    vault write -f auth/approle/role/config-server/custom-secret-id \
        secret_id="$VAULT_SECRET_ID"
    
    echo "Vault re-seeded successfully with persistent IDs."
fi

echo "Vault is ready and unsealed."
# Wait for the main process
wait $VAULT_PID
