class CommentBody
  def self.sanitize(html)
    Mentions.strip_item_labels(Rails::Html::SafeListSanitizer.new.sanitize(html.to_s, scrubber: PageContent::Scrubber.new(images: false)), html: true)
  end
end
