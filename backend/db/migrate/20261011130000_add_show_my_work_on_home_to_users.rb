class AddShowMyWorkOnHomeToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :show_my_work_on_home, :boolean, null: false, default: true
  end
end
