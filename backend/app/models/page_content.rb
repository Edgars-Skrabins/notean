class PageContent
  IMAGE_ATTRIBUTES = %w[data-attachment-id alt].freeze
  MENTION_ATTRIBUTES = %w[data-type data-mention-type data-id data-label].freeze

  class Scrubber < Rails::Html::PermitScrubber
    def initialize(images: true)
      super()
      @images = images
      self.tags = Rails::Html::SafeListSanitizer.allowed_tags
      self.attributes = Rails::Html::SafeListSanitizer.allowed_attributes
    end

    def scrub(node)
      if Mentions.mention_node?(node)
        node.attribute_nodes.each { |attribute| attribute.remove unless MENTION_ATTRIBUTES.include?(attribute.name) }
        CONTINUE
      elsif @images && node.element? && node.name == "img"
        scrub_image(node)
      else
        super
      end
    end

    private

    def scrub_image(node)
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
    Mentions.strip_item_labels(Rails::Html::SafeListSanitizer.new.sanitize(html.to_s, scrubber: Scrubber.new), html: true)
  end
end
