class RenameCardsToTickets < ActiveRecord::Migration[7.2]
  def up
    rename_table :cards, :tickets
    execute "UPDATE favorites SET favoritable_type = 'Ticket' WHERE favoritable_type = 'Card'"
  end

  def down
    execute "UPDATE favorites SET favoritable_type = 'Card' WHERE favoritable_type = 'Ticket'"
    rename_table :tickets, :cards
  end
end
