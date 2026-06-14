#!/bin/bash
# Router Panel backend start script
source /home/syahrul/litellm/.env

export DATABASE_URL="${DATABASE_URL}?sslmode=disable"
export LITELLM_MASTER_KEY="$LITELLM_MASTER_KEY"
export JWT_SECRET="router-panel-jwt-2026"
export PORT="20130"

exec /home/syahrul/router-panel/backend/router-panel
