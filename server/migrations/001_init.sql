CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(191) PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL,
  kind VARCHAR(64) NOT NULL DEFAULT 'guest',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS workspaces (
  id VARCHAR(191) PRIMARY KEY,
  owner_user_id VARCHAR(191) NOT NULL,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_workspaces_owner_user FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(191) PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  workspace_id VARCHAR(191) NOT NULL,
  token VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_sessions_token (token),
  KEY idx_sessions_workspace_id (workspace_id, updated_at),
  KEY idx_sessions_user_id (user_id, updated_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(191) PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  workspace_id VARCHAR(191) NOT NULL,
  name VARCHAR(255) NOT NULL,
  daily_calorie_target INT NOT NULL,
  protein_target INT NOT NULL,
  carbs_target INT NOT NULL,
  fat_target INT NOT NULL,
  fiber_target INT NOT NULL,
  taste_preferences JSON NOT NULL,
  dietary_restrictions JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_profiles_workspace_user (workspace_id, user_id),
  KEY idx_profiles_workspace_id (workspace_id),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_profiles_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(191) PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  workspace_id VARCHAR(191) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(128) NOT NULL,
  quantity VARCHAR(255) NOT NULL,
  quantity_value DECIMAL(12,2),
  quantity_unit VARCHAR(64),
  expire_date DATE,
  status VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY idx_inventory_workspace_id_updated_at (workspace_id, updated_at),
  KEY idx_inventory_workspace_status (workspace_id, status),
  CONSTRAINT fk_inventory_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS meal_plans (
  id VARCHAR(191) PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  workspace_id VARCHAR(191) NOT NULL,
  conversation_id VARCHAR(191),
  mode VARCHAR(64) NOT NULL,
  source_message TEXT NOT NULL,
  reply TEXT NOT NULL,
  payload JSON NOT NULL,
  generation_meta JSON,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY idx_meal_plans_workspace_id_updated_at (workspace_id, updated_at),
  KEY idx_meal_plans_conversation_id (conversation_id),
  CONSTRAINT fk_meal_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_meal_plans_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS weekly_plans (
  id VARCHAR(191) PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  workspace_id VARCHAR(191) NOT NULL,
  conversation_id VARCHAR(191),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  tags JSON NOT NULL,
  payload JSON NOT NULL,
  generation_meta JSON,
  adopted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY idx_weekly_plans_workspace_id_updated_at (workspace_id, updated_at),
  KEY idx_weekly_plans_conversation_id (conversation_id),
  CONSTRAINT fk_weekly_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_weekly_plans_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS shopping_lists (
  id VARCHAR(191) PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  workspace_id VARCHAR(191) NOT NULL,
  source_type VARCHAR(64) NOT NULL,
  source_id VARCHAR(191) NOT NULL,
  items JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_shopping_lists_workspace_source (workspace_id, source_type, source_id),
  KEY idx_shopping_lists_workspace_id_updated_at (workspace_id, updated_at),
  CONSTRAINT fk_shopping_lists_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_shopping_lists_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(191) PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  workspace_id VARCHAR(191) NOT NULL,
  title VARCHAR(255) NOT NULL,
  last_message_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY idx_conversations_workspace_id_updated_at (workspace_id, updated_at),
  CONSTRAINT fk_conversations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conversations_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS conversation_messages (
  id VARCHAR(191) PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  workspace_id VARCHAR(191) NOT NULL,
  conversation_id VARCHAR(191) NOT NULL,
  role VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  meal_plan_id VARCHAR(191),
  shopping_list_id VARCHAR(191),
  weekly_plan_id VARCHAR(191),
  created_at DATETIME(3) NOT NULL,
  KEY idx_conversation_messages_workspace_conversation_created_at (workspace_id, conversation_id, created_at),
  CONSTRAINT fk_conversation_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conversation_messages_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_conversation_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS workspace_states (
  workspace_id VARCHAR(191) PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  current_conversation_id VARCHAR(191),
  current_meal_plan_id VARCHAR(191),
  current_weekly_plan_id VARCHAR(191),
  current_shopping_list_id VARCHAR(191),
  planning_mode VARCHAR(32) NOT NULL,
  selected_weekday VARCHAR(32),
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_workspace_states_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_workspace_states_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ai_generation_events (
  id VARCHAR(191) PRIMARY KEY,
  workspace_id VARCHAR(191) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  kind VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL,
  model VARCHAR(128),
  request_id VARCHAR(191),
  prompt_version VARCHAR(64),
  source_message TEXT NOT NULL,
  input_payload JSON NOT NULL,
  raw_output LONGTEXT,
  error_message TEXT,
  created_at DATETIME(3) NOT NULL,
  KEY idx_ai_generation_events_workspace_created_at (workspace_id, created_at),
  CONSTRAINT fk_ai_generation_events_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_generation_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
