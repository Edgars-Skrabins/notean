class CreateBoardPriorities < ActiveRecord::Migration[7.2]
  DEFAULTS = [
    [ "Very low", "grey" ],
    [ "Low", "blue" ],
    [ "Medium", "yellow" ],
    [ "High", "orange" ],
    [ "Very high", "red" ]
  ].freeze

  def up
    create_table :board_priorities do |t|
      t.references :board, null: false, foreign_key: true
      t.string :name, null: false
      t.string :color, null: false
      t.integer :position, null: false
      t.timestamps
    end

    add_reference :tickets, :priority, foreign_key: { to_table: :board_priorities, on_delete: :nullify }

    defaults = DEFAULTS.each_with_index.map do |(name, color), position|
      "(#{connection.quote(name)}, #{connection.quote(color)}, #{position})"
    end
    execute <<~SQL
      INSERT INTO board_priorities (board_id, name, color, position, created_at, updated_at)
      SELECT boards.id, defaults.name, defaults.color, defaults.position, NOW(), NOW()
      FROM boards CROSS JOIN (VALUES #{defaults.join(", ")}) AS defaults(name, color, position)
    SQL
  end

  def down
    remove_reference :tickets, :priority, foreign_key: { to_table: :board_priorities }
    drop_table :board_priorities
  end
end
