class AddFavoriteSettingsToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :show_favorites_on_home, :boolean, null: false, default: true
    add_column :users, :show_favorites_in_sidebar, :boolean, null: false, default: true
  end
end
