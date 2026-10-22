class AddSearchTextToPagesAndDiagrams < ActiveRecord::Migration[7.2]
  def up
    add_column :pages, :search_text, :text, default: "", null: false
    add_column :diagrams, :search_text, :text, default: "", null: false

    Page.reset_column_information
    Diagram.reset_column_information

    Page.find_each { |page| page.update_column(:search_text, SearchText.from_html(page.content)) }
    Diagram.find_each { |diagram| diagram.update_column(:search_text, SearchText.from_diagram(diagram.content)) }
  end

  def down
    remove_column :diagrams, :search_text
    remove_column :pages, :search_text
  end
end
