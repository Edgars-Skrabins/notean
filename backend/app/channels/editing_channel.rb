class EditingChannel < ApplicationCable::Channel
  def self.status_class
    raise NotImplementedError
  end

  def subscribed
    item = self.class.status_class.item_class.find_by(id: item_id)

    if item && current_user.memberships.exists?(team_id: item.team_id) && ProjectAccess.new(current_user, item.team).visible?(item)
      stream_from self.class.status_class.stream_name(item.id)
    else
      reject
    end
  end

  def unsubscribed
    self.class.status_class.stop(item_id, current_user)
  end

  def start_editing
    self.class.status_class.start(item_id, current_user)
  end

  def stop_editing
    self.class.status_class.stop(item_id, current_user)
  end

  private

  def item_id
    params[:"#{self.class.status_class.item_name}_id"]
  end
end
