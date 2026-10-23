class AddFeatureFlagsToTeams < ActiveRecord::Migration[7.2]
  def change
    add_column :teams, :pages_enabled, :boolean, default: true, null: false
    add_column :teams, :diagrams_enabled, :boolean, default: true, null: false
    add_column :teams, :boards_enabled, :boolean, default: true, null: false
  end
end
