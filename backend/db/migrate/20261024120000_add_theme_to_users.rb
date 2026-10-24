class AddThemeToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :theme, :string, default: "purple_haze", null: false
    add_column :users, :theme_mode, :string, default: "system", null: false
  end
end
