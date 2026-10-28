class CommentBody
  def self.sanitize(html)
    Rails::Html::SafeListSanitizer.new.sanitize(html.to_s)
  end
end
