class MentionNotifications
  def self.call(item:, before:, after:, actor:, html:)
    user_ids = Mentions.user_ids_in(after, html: html) - Mentions.user_ids_in(before, html: html) - [ actor.id ]
    return [] if user_ids.empty?

    Notifier.mentioned(item, actor, user_ids, excerpt: html ? SearchText.from_html(after) : Mentions.plain_text(after))
    user_ids
  end
end
