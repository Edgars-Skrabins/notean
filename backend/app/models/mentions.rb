module Mentions
  TYPES = %w[user ticket page diagram board project].freeze
  TOKEN_PATTERN = /@\[(user|ticket|page|diagram|board|project):(\d+)(?:\|([^\]\n]*))?\]/

  def self.mention_node?(node)
    node.element? && node.name == "span" && node["data-type"] == "mention" &&
      TYPES.include?(node["data-mention-type"]) && node["data-id"].to_s.match?(/\A\d+\z/)
  end

  def self.refs_in_text(text)
    text.to_s.scan(TOKEN_PATTERN).map { |type, id, _label| [ type, id.to_i ] }.uniq
  end

  def self.refs_in_html(html)
    Loofah.fragment(html.to_s).css("span[data-type='mention']").select { |node| mention_node?(node) }.map { |node| [ node["data-mention-type"], node["data-id"].to_i ] }.uniq
  end

  def self.strip_item_labels(content, html:)
    return content if content.nil?
    return content.gsub(TOKEN_PATTERN) { |token| $1 == "user" ? token : "@[#{$1}:#{$2}]" } unless html

    fragment = Loofah.fragment(content.to_s)
    fragment.css("span[data-type='mention']").each do |node|
      next unless mention_node?(node) && node["data-mention-type"] != "user"

      node.remove_attribute("data-label")
      node.content = "@"
    end
    fragment.to_s
  end

  def self.plain_text(text)
    text.to_s.gsub(TOKEN_PATTERN) { "@#{Regexp.last_match(3)}" }.squish
  end

  def self.user_ids_in(content, html:)
    (html ? refs_in_html(content) : refs_in_text(content)).filter_map { |type, id| id if type == "user" }
  end
end
