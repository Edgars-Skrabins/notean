class DiagramEditingStatus
  EXPIRY = 30.minutes

  def self.read(diagram_id)
    Rails.cache.read(cache_key(diagram_id))
  end

  def self.start(diagram_id, user)
    nickname = nickname_for(diagram_id, user)
    Rails.cache.write(cache_key(diagram_id), { user_id: user.id, nickname: nickname }, expires_in: EXPIRY)
    broadcast(diagram_id, { id: user.id, nickname: nickname })
  end

  def self.stop(diagram_id, user)
    current = read(diagram_id)
    return unless current && current[:user_id] == user.id

    Rails.cache.delete(cache_key(diagram_id))
    broadcast(diagram_id, nil)
  end

  def self.broadcast(diagram_id, editing)
    ActionCable.server.broadcast("diagram_editing_#{diagram_id}", { editing: editing })
  end

  def self.cache_key(diagram_id)
    "diagram_editing:#{diagram_id}"
  end

  def self.nickname_for(diagram_id, user)
    Membership.joins(team: :diagrams).find_by(diagrams: { id: diagram_id }, user_id: user.id)&.nickname
  end
end
