class PageContent
  IMAGE_ATTRIBUTES = %w[data-attachment-id alt].freeze

  class Scrubber < Rails::Html::PermitScrubber
    def initialize
      super
      self.tags = Rails::Html::SafeListSanitizer.allowed_tags
      self.attributes = Rails::Html::SafeListSanitizer.allowed_attributes
    end

    def scrub(node)
      return super unless node.element? && node.name == "img"

      if node["data-attachment-id"].to_s.match?(/\A\d+\z/)
        node.attribute_nodes.each { |attribute| attribute.remove unless IMAGE_ATTRIBUTES.include?(attribute.name) }
        CONTINUE
      else
        node.remove
        STOP
      end
    end
  end

  def self.sanitize(html)
    Rails::Html::SafeListSanitizer.new.sanitize(html.to_s, scrubber: Scrubber.new)
  end
end
