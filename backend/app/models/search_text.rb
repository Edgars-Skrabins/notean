class SearchText
  def self.from_html(html)
    squish(Rails::Html::FullSanitizer.new.sanitize(html.to_s.gsub("<", " <")))
  end

  def self.from_diagram(json)
    cells = JSON.parse(json.to_s)["cells"]
    return "" unless cells.is_a?(Array)

    squish(cells.flat_map { |cell| cell_texts(cell) }.join(" "))
  rescue JSON::ParserError, TypeError, NoMethodError
    ""
  end

  def self.cell_texts(cell)
    node_text = cell.dig("attrs", "text", "text")
    labels = Array(cell["labels"]).map { |label| label.is_a?(String) ? label : label.dig("attrs", "label", "text") }

    [ node_text, *labels ].compact.map(&:to_s)
  end

  def self.squish(text)
    CGI.unescapeHTML(text).squish
  end

  private_class_method :cell_texts, :squish
end
