# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_26_120000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pg_trgm"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "board_priorities", force: :cascade do |t|
    t.bigint "board_id", null: false
    t.string "name", null: false
    t.string "color", null: false
    t.integer "position", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["board_id"], name: "index_board_priorities_on_board_id"
  end

  create_table "board_tags", force: :cascade do |t|
    t.bigint "board_id", null: false
    t.string "name", null: false
    t.string "color", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "board_id, lower((name)::text)", name: "index_board_tags_on_board_id_and_lower_name", unique: true
  end

  create_table "boards", force: :cascade do |t|
    t.integer "team_id", null: false
    t.integer "created_by_user_id", null: false
    t.string "title", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "project_id"
    t.bigint "trash_entry_id"
    t.index "lower((title)::text) gin_trgm_ops", name: "index_boards_on_lower_title_trgm", using: :gin
    t.index ["created_by_user_id"], name: "index_boards_on_created_by_user_id"
    t.index ["project_id"], name: "index_boards_on_project_id"
    t.index ["team_id"], name: "index_boards_on_team_id"
    t.index ["trash_entry_id"], name: "index_boards_on_trash_entry_id"
  end

  create_table "columns", force: :cascade do |t|
    t.integer "board_id", null: false
    t.string "title", null: false
    t.integer "position", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["board_id"], name: "index_columns_on_board_id"
  end

  create_table "comments", force: :cascade do |t|
    t.integer "team_id", null: false
    t.string "commentable_type", null: false
    t.integer "commentable_id", null: false
    t.integer "created_by_user_id", null: false
    t.text "body", null: false
    t.datetime "edited_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["commentable_type", "commentable_id", "id"], name: "index_comments_on_commentable_and_id"
    t.index ["created_by_user_id"], name: "index_comments_on_created_by_user_id"
    t.index ["team_id"], name: "index_comments_on_team_id"
  end

  create_table "diagram_comment_pins", force: :cascade do |t|
    t.integer "team_id", null: false
    t.integer "diagram_id", null: false
    t.integer "created_by_user_id", null: false
    t.float "x", null: false
    t.float "y", null: false
    t.datetime "resolved_at"
    t.integer "resolved_by_user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["diagram_id"], name: "index_diagram_comment_pins_on_diagram_id"
    t.index ["team_id"], name: "index_diagram_comment_pins_on_team_id"
  end

  create_table "diagram_contributors", force: :cascade do |t|
    t.integer "diagram_id", null: false
    t.integer "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["diagram_id", "user_id"], name: "index_diagram_contributors_on_diagram_id_and_user_id", unique: true
    t.index ["user_id"], name: "index_diagram_contributors_on_user_id"
  end

  create_table "diagrams", force: :cascade do |t|
    t.integer "team_id", null: false
    t.integer "created_by_user_id", null: false
    t.string "title", null: false
    t.text "content", default: "", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "folder_id"
    t.integer "project_id"
    t.text "search_text", default: "", null: false
    t.integer "lock_version", default: 0, null: false
    t.bigint "trash_entry_id"
    t.index "lower((title)::text) gin_trgm_ops", name: "index_diagrams_on_lower_title_trgm", using: :gin
    t.index "lower(search_text) gin_trgm_ops", name: "index_diagrams_on_lower_search_text_trgm", using: :gin
    t.index ["created_by_user_id"], name: "index_diagrams_on_created_by_user_id"
    t.index ["folder_id"], name: "index_diagrams_on_folder_id"
    t.index ["project_id"], name: "index_diagrams_on_project_id"
    t.index ["team_id"], name: "index_diagrams_on_team_id"
    t.index ["trash_entry_id"], name: "index_diagrams_on_trash_entry_id"
  end

  create_table "favorites", force: :cascade do |t|
    t.integer "user_id", null: false
    t.integer "team_id", null: false
    t.string "favoritable_type", null: false
    t.integer "favoritable_id", null: false
    t.integer "home_position", null: false
    t.integer "sidebar_position", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["favoritable_type", "favoritable_id"], name: "index_favorites_on_favoritable"
    t.index ["team_id"], name: "index_favorites_on_team_id"
    t.index ["user_id", "favoritable_type", "favoritable_id"], name: "index_favorites_on_user_and_favoritable", unique: true
    t.index ["user_id", "team_id"], name: "index_favorites_on_user_id_and_team_id"
  end

  create_table "folders", force: :cascade do |t|
    t.integer "team_id", null: false
    t.string "item_type", null: false
    t.integer "parent_id"
    t.integer "created_by_user_id", null: false
    t.string "title", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "project_id"
    t.bigint "trash_entry_id"
    t.index ["created_by_user_id"], name: "index_folders_on_created_by_user_id"
    t.index ["parent_id"], name: "index_folders_on_parent_id"
    t.index ["project_id"], name: "index_folders_on_project_id"
    t.index ["team_id"], name: "index_folders_on_team_id"
    t.index ["trash_entry_id"], name: "index_folders_on_trash_entry_id"
  end

  create_table "memberships", force: :cascade do |t|
    t.integer "user_id", null: false
    t.integer "team_id", null: false
    t.string "role", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "last_active_at", null: false
    t.string "nickname", null: false
    t.datetime "removed_at"
    t.index ["team_id", "nickname"], name: "index_memberships_on_team_id_and_nickname", unique: true
    t.index ["team_id", "removed_at"], name: "index_memberships_on_team_id_and_removed_at"
    t.index ["team_id"], name: "index_memberships_on_team_id"
    t.index ["team_id"], name: "index_memberships_on_team_id_unique_owner", unique: true, where: "((role)::text = 'owner'::text)"
    t.index ["user_id", "team_id"], name: "index_memberships_on_user_id_and_team_id", unique: true
    t.index ["user_id"], name: "index_memberships_on_user_id"
  end

  create_table "page_contributors", force: :cascade do |t|
    t.integer "page_id", null: false
    t.integer "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["page_id", "user_id"], name: "index_page_contributors_on_page_id_and_user_id", unique: true
    t.index ["user_id"], name: "index_page_contributors_on_user_id"
  end

  create_table "pages", force: :cascade do |t|
    t.integer "team_id", null: false
    t.integer "created_by_user_id", null: false
    t.string "title", null: false
    t.text "content", default: "", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "folder_id"
    t.integer "project_id"
    t.text "search_text", default: "", null: false
    t.integer "lock_version", default: 0, null: false
    t.bigint "trash_entry_id"
    t.index "lower((title)::text) gin_trgm_ops", name: "index_pages_on_lower_title_trgm", using: :gin
    t.index "lower(search_text) gin_trgm_ops", name: "index_pages_on_lower_search_text_trgm", using: :gin
    t.index ["created_by_user_id"], name: "index_pages_on_created_by_user_id"
    t.index ["folder_id"], name: "index_pages_on_folder_id"
    t.index ["project_id"], name: "index_pages_on_project_id"
    t.index ["team_id"], name: "index_pages_on_team_id"
    t.index ["trash_entry_id"], name: "index_pages_on_trash_entry_id"
  end

  create_table "project_members", force: :cascade do |t|
    t.integer "project_id", null: false
    t.integer "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id", "user_id"], name: "index_project_members_on_project_id_and_user_id", unique: true
    t.index ["project_id"], name: "index_project_members_on_project_id"
    t.index ["user_id"], name: "index_project_members_on_user_id"
  end

  create_table "projects", force: :cascade do |t|
    t.integer "team_id", null: false
    t.string "name", null: false
    t.text "description", default: "", null: false
    t.integer "owner_user_id", null: false
    t.integer "created_by_user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "lower((name)::text) gin_trgm_ops", name: "index_projects_on_lower_name_trgm", using: :gin
    t.index "lower(description) gin_trgm_ops", name: "index_projects_on_lower_description_trgm", using: :gin
    t.index ["team_id", "name"], name: "index_projects_on_team_id_and_name", unique: true
    t.index ["team_id"], name: "index_projects_on_team_id"
  end

  create_table "solid_queue_batch_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.bigint "batch_id", null: false
    t.datetime "created_at", null: false
    t.index ["batch_id"], name: "index_solid_queue_batch_executions_on_batch_id"
    t.index ["job_id"], name: "index_solid_queue_batch_executions_on_job_id", unique: true
  end

  create_table "solid_queue_batches", force: :cascade do |t|
    t.string "active_job_batch_id"
    t.string "description"
    t.text "on_finish"
    t.text "on_success"
    t.text "on_failure"
    t.text "metadata"
    t.integer "total_jobs", default: 0, null: false
    t.integer "completed_jobs", default: 0, null: false
    t.integer "failed_jobs", default: 0, null: false
    t.datetime "enqueued_at"
    t.datetime "finished_at"
    t.datetime "failed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active_job_batch_id"], name: "index_solid_queue_batches_on_active_job_batch_id", unique: true
    t.index ["finished_at"], name: "index_solid_queue_batches_on_finished_at"
  end

  create_table "solid_queue_blocked_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.string "concurrency_key", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.index ["concurrency_key", "priority", "job_id"], name: "index_solid_queue_blocked_executions_for_release"
    t.index ["expires_at", "concurrency_key"], name: "index_solid_queue_blocked_executions_for_maintenance"
    t.index ["job_id"], name: "index_solid_queue_blocked_executions_on_job_id", unique: true
  end

  create_table "solid_queue_claimed_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.bigint "process_id"
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_claimed_executions_on_job_id", unique: true
    t.index ["process_id", "job_id"], name: "index_solid_queue_claimed_executions_on_process_id_and_job_id"
  end

  create_table "solid_queue_failed_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.text "error"
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_failed_executions_on_job_id", unique: true
  end

  create_table "solid_queue_jobs", force: :cascade do |t|
    t.string "queue_name", null: false
    t.string "class_name", null: false
    t.text "arguments"
    t.integer "priority", default: 0, null: false
    t.string "active_job_id"
    t.datetime "scheduled_at"
    t.datetime "finished_at"
    t.string "concurrency_key"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "batch_id"
    t.index ["active_job_id"], name: "index_solid_queue_jobs_on_active_job_id"
    t.index ["batch_id"], name: "index_solid_queue_jobs_on_batch_id"
    t.index ["class_name"], name: "index_solid_queue_jobs_on_class_name"
    t.index ["finished_at"], name: "index_solid_queue_jobs_on_finished_at"
    t.index ["queue_name", "finished_at"], name: "index_solid_queue_jobs_for_filtering"
    t.index ["scheduled_at", "finished_at"], name: "index_solid_queue_jobs_for_alerting"
  end

  create_table "solid_queue_pauses", force: :cascade do |t|
    t.string "queue_name", null: false
    t.datetime "created_at", null: false
    t.index ["queue_name"], name: "index_solid_queue_pauses_on_queue_name", unique: true
  end

  create_table "solid_queue_processes", force: :cascade do |t|
    t.string "kind", null: false
    t.datetime "last_heartbeat_at", null: false
    t.bigint "supervisor_id"
    t.integer "pid", null: false
    t.string "hostname"
    t.text "metadata"
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.index ["last_heartbeat_at"], name: "index_solid_queue_processes_on_last_heartbeat_at"
    t.index ["name", "supervisor_id"], name: "index_solid_queue_processes_on_name_and_supervisor_id", unique: true
    t.index ["supervisor_id"], name: "index_solid_queue_processes_on_supervisor_id"
  end

  create_table "solid_queue_ready_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_ready_executions_on_job_id", unique: true
    t.index ["priority", "job_id"], name: "index_solid_queue_poll_all"
    t.index ["queue_name", "priority", "job_id"], name: "index_solid_queue_poll_by_queue"
  end

  create_table "solid_queue_recurring_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "task_key", null: false
    t.datetime "run_at", null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_recurring_executions_on_job_id", unique: true
    t.index ["task_key", "run_at"], name: "index_solid_queue_recurring_executions_on_task_key_and_run_at", unique: true
  end

  create_table "solid_queue_recurring_tasks", force: :cascade do |t|
    t.string "key", null: false
    t.string "schedule", null: false
    t.string "command", limit: 2048
    t.string "class_name"
    t.text "arguments"
    t.string "queue_name"
    t.integer "priority", default: 0
    t.boolean "static", default: true, null: false
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_solid_queue_recurring_tasks_on_key", unique: true
    t.index ["static"], name: "index_solid_queue_recurring_tasks_on_static"
  end

  create_table "solid_queue_scheduled_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "scheduled_at", null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_scheduled_executions_on_job_id", unique: true
    t.index ["scheduled_at", "priority", "job_id"], name: "index_solid_queue_dispatch_all"
  end

  create_table "solid_queue_semaphores", force: :cascade do |t|
    t.string "key", null: false
    t.integer "value", default: 1, null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_solid_queue_semaphores_on_expires_at"
    t.index ["key", "value"], name: "index_solid_queue_semaphores_on_key_and_value"
    t.index ["key"], name: "index_solid_queue_semaphores_on_key", unique: true
  end

  create_table "teams", force: :cascade do |t|
    t.string "code"
    t.string "password"
    t.string "password_digest"
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "pages_enabled", default: true, null: false
    t.boolean "diagrams_enabled", default: true, null: false
    t.boolean "boards_enabled", default: true, null: false
    t.index ["code"], name: "index_teams_on_code", unique: true
  end

  create_table "ticket_assignees", force: :cascade do |t|
    t.integer "ticket_id", null: false
    t.integer "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["ticket_id", "user_id"], name: "index_ticket_assignees_on_ticket_id_and_user_id", unique: true
    t.index ["user_id"], name: "index_ticket_assignees_on_user_id"
  end

  create_table "ticket_tags", force: :cascade do |t|
    t.bigint "ticket_id", null: false
    t.bigint "board_tag_id", null: false
    t.datetime "created_at", null: false
    t.index ["board_tag_id"], name: "index_ticket_tags_on_board_tag_id"
    t.index ["ticket_id", "board_tag_id"], name: "index_ticket_tags_on_ticket_id_and_board_tag_id", unique: true
  end

  create_table "tickets", force: :cascade do |t|
    t.integer "column_id"
    t.integer "team_id", null: false
    t.integer "created_by_user_id", null: false
    t.string "title", null: false
    t.text "description"
    t.integer "position", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "board_id", null: false
    t.bigint "priority_id"
    t.integer "lock_version", default: 0, null: false
    t.bigint "trash_entry_id"
    t.index "lower((title)::text) gin_trgm_ops", name: "index_tickets_on_lower_title_trgm", using: :gin
    t.index "lower(description) gin_trgm_ops", name: "index_tickets_on_lower_description_trgm", using: :gin
    t.index ["board_id", "column_id", "position"], name: "index_tickets_on_board_id_and_column_id_and_position"
    t.index ["column_id"], name: "index_tickets_on_column_id"
    t.index ["created_by_user_id"], name: "index_tickets_on_created_by_user_id"
    t.index ["priority_id"], name: "index_tickets_on_priority_id"
    t.index ["team_id"], name: "index_tickets_on_team_id"
    t.index ["trash_entry_id"], name: "index_tickets_on_trash_entry_id"
  end

  create_table "trash_entries", force: :cascade do |t|
    t.bigint "team_id", null: false
    t.string "item_type", null: false
    t.bigint "item_id", null: false
    t.string "title", null: false
    t.bigint "project_id"
    t.bigint "deleted_by_user_id", null: false
    t.datetime "created_at", null: false
    t.index "lower((title)::text) gin_trgm_ops", name: "index_trash_entries_on_lower_title_trgm", using: :gin
    t.index ["created_at"], name: "index_trash_entries_on_created_at"
    t.index ["deleted_by_user_id"], name: "index_trash_entries_on_deleted_by_user_id"
    t.index ["item_type", "item_id"], name: "index_trash_entries_on_item_type_and_item_id", unique: true
    t.index ["project_id"], name: "index_trash_entries_on_project_id"
    t.index ["team_id", "created_at"], name: "index_trash_entries_on_team_id_and_created_at"
  end

  create_table "user_sessions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.datetime "last_used_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_user_sessions_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", null: false
    t.string "password_digest", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "show_favorites_on_home", default: true, null: false
    t.boolean "show_favorites_in_sidebar", default: true, null: false
    t.string "avatar_color"
    t.boolean "show_my_work_on_home", default: true, null: false
    t.string "theme", default: "purple_haze", null: false
    t.string "theme_mode", default: "system", null: false
    t.datetime "deleted_at"
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "board_priorities", "boards"
  add_foreign_key "board_tags", "boards"
  add_foreign_key "boards", "projects"
  add_foreign_key "boards", "teams"
  add_foreign_key "boards", "trash_entries"
  add_foreign_key "boards", "users", column: "created_by_user_id"
  add_foreign_key "columns", "boards"
  add_foreign_key "comments", "teams"
  add_foreign_key "comments", "users", column: "created_by_user_id"
  add_foreign_key "diagram_comment_pins", "diagrams"
  add_foreign_key "diagram_comment_pins", "teams"
  add_foreign_key "diagram_comment_pins", "users", column: "created_by_user_id"
  add_foreign_key "diagram_comment_pins", "users", column: "resolved_by_user_id"
  add_foreign_key "diagram_contributors", "diagrams"
  add_foreign_key "diagram_contributors", "users"
  add_foreign_key "diagrams", "folders"
  add_foreign_key "diagrams", "projects"
  add_foreign_key "diagrams", "teams"
  add_foreign_key "diagrams", "trash_entries"
  add_foreign_key "diagrams", "users", column: "created_by_user_id"
  add_foreign_key "favorites", "teams"
  add_foreign_key "favorites", "users"
  add_foreign_key "folders", "folders", column: "parent_id"
  add_foreign_key "folders", "projects"
  add_foreign_key "folders", "teams"
  add_foreign_key "folders", "trash_entries"
  add_foreign_key "folders", "users", column: "created_by_user_id"
  add_foreign_key "memberships", "teams"
  add_foreign_key "memberships", "users"
  add_foreign_key "page_contributors", "pages"
  add_foreign_key "page_contributors", "users"
  add_foreign_key "pages", "folders"
  add_foreign_key "pages", "projects"
  add_foreign_key "pages", "teams"
  add_foreign_key "pages", "trash_entries"
  add_foreign_key "pages", "users", column: "created_by_user_id"
  add_foreign_key "project_members", "projects"
  add_foreign_key "project_members", "users"
  add_foreign_key "projects", "teams"
  add_foreign_key "projects", "users", column: "created_by_user_id"
  add_foreign_key "projects", "users", column: "owner_user_id"
  add_foreign_key "solid_queue_batch_executions", "solid_queue_batches", column: "batch_id", on_delete: :cascade
  add_foreign_key "solid_queue_batch_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_blocked_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_claimed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_failed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_ready_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_recurring_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_scheduled_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "ticket_assignees", "tickets"
  add_foreign_key "ticket_assignees", "users"
  add_foreign_key "ticket_tags", "board_tags", on_delete: :cascade
  add_foreign_key "ticket_tags", "tickets", on_delete: :cascade
  add_foreign_key "tickets", "board_priorities", column: "priority_id", on_delete: :nullify
  add_foreign_key "tickets", "boards"
  add_foreign_key "tickets", "columns"
  add_foreign_key "tickets", "teams"
  add_foreign_key "tickets", "trash_entries"
  add_foreign_key "tickets", "users", column: "created_by_user_id"
  add_foreign_key "trash_entries", "projects", on_delete: :nullify
  add_foreign_key "trash_entries", "teams"
  add_foreign_key "trash_entries", "users", column: "deleted_by_user_id"
  add_foreign_key "user_sessions", "users"
end
