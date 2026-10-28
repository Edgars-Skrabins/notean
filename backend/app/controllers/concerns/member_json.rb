module MemberJson
  extend ActiveSupport::Concern

  private

  def member_json(user)
    { id: user.id, nickname: team_nicknames[user.id], avatar: avatar_json(user) }
  end

  def avatar_json(user)
    {
      color: user.effective_avatar_color,
      image_url: user.avatar_image.attached? ? rails_storage_proxy_path(user.avatar_image, only_path: true) : nil
    }
  end

  def team_nicknames
    @team_nicknames ||= @team.all_memberships.pluck(:user_id, :nickname).to_h
  end
end
