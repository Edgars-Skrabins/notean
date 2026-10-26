class UserSession < ApplicationRecord
  IDLE_EXPIRY = 30.days
  TOUCH_INTERVAL = 1.hour

  belongs_to :user

  scope :active, -> { where("last_used_at > ?", IDLE_EXPIRY.ago) }

  def touch_if_stale!
    touch(:last_used_at) if last_used_at < TOUCH_INTERVAL.ago
  end
end
