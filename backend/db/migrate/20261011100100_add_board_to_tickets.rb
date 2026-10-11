class AddBoardToTickets < ActiveRecord::Migration[7.2]
  def up
    add_reference :tickets, :board, foreign_key: true
    execute "UPDATE tickets SET board_id = (SELECT board_id FROM columns WHERE columns.id = tickets.column_id)"
    change_column_null :tickets, :board_id, false
    change_column_null :tickets, :column_id, true
    add_index :tickets, [ :board_id, :column_id, :position ]
  end

  def down
    execute "DELETE FROM tickets WHERE column_id IS NULL"
    remove_index :tickets, [ :board_id, :column_id, :position ]
    change_column_null :tickets, :column_id, false
    remove_reference :tickets, :board, foreign_key: true
  end
end
