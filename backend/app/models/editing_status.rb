class EditingStatus
  EXPIRY = 30.minutes

  def self.item_class
    raise NotImplementedError
  end

  def self.read(item_id)
    Rails.cache.read(cache_key(item_id))
  end

  def self.start(item_id, user)
    nickname = nickname_for(item_id, user)
    Rails.cache.write(cache_key(item_id), { user_id: user.id, nickname: nickname }, expires_in: EXPIRY)
    broadcast(item_id, { id: user.id, nickname: nickname })
  end

  def self.stop(item_id, user)
    current = read(item_id)
    return unless current && current[:user_id] == user.id

    Rails.cache.delete(cache_key(item_id))
    broadcast(item_id, nil)
  end

  def self.stream_name(item_id)
    "#{item_name}_editing_#{item_id}"
  end

  def self.broadcast(item_id, editing)
    ActionCable.server.broadcast(stream_name(item_id), { editing: editing })
  end

  def self.cache_key(item_id)
    "#{item_name}_editing:#{item_id}"
  end

  def self.item_name
    item_class.model_name.singular
  end

  def self.nickname_for(item_id, user)
    item_class.find_by(id: item_id)&.team&.memberships&.find_by(user: user)&.nickname
  end
end
