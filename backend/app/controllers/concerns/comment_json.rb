module CommentJson
  extend ActiveSupport::Concern

  COMMENT_PRELOAD = { creator: User::AVATAR_PRELOAD }.freeze

  private

  def comment_json(comment)
    {
      id: comment.id,
      body: comment.body,
      created_at: comment.created_at,
      edited_at: comment.edited_at,
      author: member_json(comment.creator)
    }
  end

  def comment_error_code(comment, fallback)
    return ErrorCodes::Comments::COMMENT_BODY_REQUIRED if comment.errors.of_kind?(:body, :blank)

    limit_error_code(comment) || fallback
  end
end
