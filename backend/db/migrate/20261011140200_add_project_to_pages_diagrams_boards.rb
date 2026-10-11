class AddProjectToPagesDiagramsBoards < ActiveRecord::Migration[7.2]
  def change
    add_reference :pages, :project, foreign_key: true
    add_reference :diagrams, :project, foreign_key: true
    add_reference :boards, :project, foreign_key: true
  end
end
