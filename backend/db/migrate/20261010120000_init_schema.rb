class InitSchema < ActiveRecord::Migration[7.2]
  def change
    create_table "boards" do |t|
      t.integer "team_id", null: false
      t.integer "created_by_user_id", null: false
      t.string "title", null: false
      t.datetime "created_at", null: false
      t.datetime "updated_at", null: false
      t.index ["created_by_user_id"], name: "index_boards_on_created_by_user_id"
      t.index ["team_id"], name: "index_boards_on_team_id"
    end

    create_table "cards" do |t|
      t.integer "column_id", null: false
      t.integer "team_id", null: false
      t.integer "created_by_user_id", null: false
      t.string "title", null: false
      t.text "description"
      t.integer "position", null: false
      t.datetime "created_at", null: false
      t.datetime "updated_at", null: false
      t.index ["column_id"], name: "index_cards_on_column_id"
      t.index ["created_by_user_id"], name: "index_cards_on_created_by_user_id"
      t.index ["team_id"], name: "index_cards_on_team_id"
    end

    create_table "columns" do |t|
      t.integer "board_id", null: false
      t.string "title", null: false
      t.integer "position", null: false
      t.datetime "created_at", null: false
      t.datetime "updated_at", null: false
      t.index ["board_id"], name: "index_columns_on_board_id"
    end

    create_table "diagram_contributors" do |t|
      t.integer "diagram_id", null: false
      t.integer "user_id", null: false
      t.datetime "created_at", null: false
      t.datetime "updated_at", null: false
      t.index ["diagram_id", "user_id"], name: "index_diagram_contributors_on_diagram_id_and_user_id", unique: true
      t.index ["diagram_id"], name: "index_diagram_contributors_on_diagram_id"
      t.index ["user_id"], name: "index_diagram_contributors_on_user_id"
    end

    create_table "diagrams" do |t|
      t.integer "team_id", null: false
      t.integer "created_by_user_id", null: false
      t.string "title", null: false
      t.text "content", default: "", null: false
      t.datetime "created_at", null: false
      t.datetime "updated_at", null: false
      t.integer "folder_id"
      t.index ["created_by_user_id"], name: "index_diagrams_on_created_by_user_id"
      t.index ["folder_id"], name: "index_diagrams_on_folder_id"
      t.index ["team_id"], name: "index_diagrams_on_team_id"
    end

    create_table "folders" do |t|
      t.integer "team_id", null: false
      t.string "item_type", null: false
      t.integer "parent_id"
      t.integer "created_by_user_id", null: false
      t.string "title", null: false
      t.datetime "created_at", null: false
      t.datetime "updated_at", null: false
      t.index ["created_by_user_id"], name: "index_folders_on_created_by_user_id"
      t.index ["parent_id"], name: "index_folders_on_parent_id"
      t.index ["team_id"], name: "index_folders_on_team_id"
    end

    create_table "memberships" do |t|
      t.integer "user_id", null: false
      t.integer "team_id", null: false
      t.string "role", null: false
      t.datetime "created_at", null: false
      t.datetime "updated_at", null: false
      t.datetime "last_active_at", null: false
      t.string "nickname", null: false
      t.index ["team_id", "nickname"], name: "index_memberships_on_team_id_and_nickname", unique: true
      t.index ["team_id"], name: "index_memberships_on_team_id"
      t.index ["team_id"], name: "index_memberships_on_team_id_unique_owner", unique: true, where: "role = 'owner'"
      t.index ["user_id", "team_id"], name: "index_memberships_on_user_id_and_team_id", unique: true
      t.index ["user_id"], name: "index_memberships_on_user_id"
    end

    create_table "page_contributors" do |t|
      t.integer "page_id", null: false
      t.integer "user_id", null: false
      t.datetime "created_at", null: false
      t.datetime "updated_at", null: false
      t.index ["page_id", "user_id"], name: "index_page_contributors_on_page_id_and_user_id", unique: true
      t.index ["page_id"], name: "index_page_contributors_on_page_id"
      t.index ["user_id"], name: "index_page_contributors_on_user_id"
    end

    create_table "pages" do |t|
      t.integer "team_id", null: false
      t.integer "created_by_user_id", null: false
      t.string "title", null: false
      t.text "content", default: "", null: false
      t.datetime "created_at", null: false
      t.datetime "updated_at", null: false
      t.integer "folder_id"
      t.index ["created_by_user_id"], name: "index_pages_on_created_by_user_id"
      t.index ["folder_id"], name: "index_pages_on_folder_id"
      t.index ["team_id"], name: "index_pages_on_team_id"
    end

    create_table "teams" do |t|
      t.string "code"
      t.string "password"
      t.string "password_digest"
      t.string "name", null: false
      t.datetime "created_at", null: false
      t.datetime "updated_at", null: false
      t.index ["code"], name: "index_teams_on_code", unique: true
    end

    create_table "users" do |t|
      t.string "email", null: false
      t.string "password_digest", null: false
      t.datetime "created_at", null: false
      t.datetime "updated_at", null: false
      t.index ["email"], name: "index_users_on_email", unique: true
    end

    add_foreign_key "boards", "teams"
    add_foreign_key "boards", "users", column: "created_by_user_id"
    add_foreign_key "cards", "columns"
    add_foreign_key "cards", "teams"
    add_foreign_key "cards", "users", column: "created_by_user_id"
    add_foreign_key "columns", "boards"
    add_foreign_key "diagram_contributors", "diagrams"
    add_foreign_key "diagram_contributors", "users"
    add_foreign_key "diagrams", "folders"
    add_foreign_key "diagrams", "teams"
    add_foreign_key "diagrams", "users", column: "created_by_user_id"
    add_foreign_key "folders", "folders", column: "parent_id"
    add_foreign_key "folders", "teams"
    add_foreign_key "folders", "users", column: "created_by_user_id"
    add_foreign_key "memberships", "teams"
    add_foreign_key "memberships", "users"
    add_foreign_key "page_contributors", "pages"
    add_foreign_key "page_contributors", "users"
    add_foreign_key "pages", "folders"
    add_foreign_key "pages", "teams"
    add_foreign_key "pages", "users", column: "created_by_user_id"
  end
end
