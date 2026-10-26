module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private

    def find_verified_user
      ticket = request.params[:ticket]
      payload = ticket ? JsonWebToken.decode(ticket) : {}
      session = UserSession.active.find_by(id: payload[:session_id]) if payload[:purpose] == "cable" && payload[:exp]
      session&.user || reject_unauthorized_connection
    rescue JWT::DecodeError
      reject_unauthorized_connection
    end
  end
end
