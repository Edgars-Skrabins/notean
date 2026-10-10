class CreateFavorites < ActiveRecord::Migration[7.2]
  def change
    create_table :favorites do |t|
      t.references :user, null: false, foreign_key: true, index: false
      t.references :team, null: false, foreign_key: true
      t.references :favoritable, polymorphic: true, null: false
      t.integer :home_position, null: false
      t.integer :sidebar_position, null: false
      t.timestamps
      t.index [ :user_id, :favoritable_type, :favoritable_id ], unique: true, name: "index_favorites_on_user_and_favoritable"
      t.index [ :user_id, :team_id ]
    end
  end
end
