class CreateTicketAssignees < ActiveRecord::Migration[7.2]
  def change
    create_table :ticket_assignees do |t|
      t.references :ticket, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.timestamps
    end

    add_index :ticket_assignees, [ :ticket_id, :user_id ], unique: true
  end
end
