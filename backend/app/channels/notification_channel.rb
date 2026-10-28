class NotificationChannel < ApplicationCable::Channel
  def self.stream_name(user)
    "notifications:#{user.id}"
  end

  def subscribed
    stream_from self.class.stream_name(current_user)
  end
end
