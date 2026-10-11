class CreateProjects < ActiveRecord::Migration[7.2]
  def change
    create_table :projects do |t|
      t.references :team, null: false, foreign_key: true
      t.string :name, null: false
      t.text :description, null: false, default: ""
      t.integer :owner_user_id, null: false
      t.integer :created_by_user_id, null: false
      t.timestamps
    end

    add_index :projects, [ :team_id, :name ], unique: true
    add_foreign_key :projects, :users, column: :owner_user_id
    add_foreign_key :projects, :users, column: :created_by_user_id
  end
end
