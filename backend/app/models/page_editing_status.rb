class PageEditingStatus
  EXPIRY = 30.minutes

  def self.read(page_id)
    Rails.cache.read(cache_key(page_id))
  end

  def self.start(page_id, user)
    nickname = nickname_for(page_id, user)
    Rails.cache.write(cache_key(page_id), { user_id: user.id, nickname: nickname }, expires_in: EXPIRY)
    broadcast(page_id, { id: user.id, nickname: nickname })
  end

  def self.stop(page_id, user)
    current = read(page_id)
    return unless current && current[:user_id] == user.id

    Rails.cache.delete(cache_key(page_id))
    broadcast(page_id, nil)
  end

  def self.broadcast(page_id, editing)
    ActionCable.server.broadcast("page_editing_#{page_id}", { editing: editing })
  end

  def self.cache_key(page_id)
    "page_editing:#{page_id}"
  end

  def self.nickname_for(page_id, user)
    Membership.joins(team: :pages).find_by(pages: { id: page_id }, user_id: user.id)&.nickname
  end
end
