class Rack::Attack
  LOGIN_PATH = "/auth/login"
  REGISTER_PATH = "/auth/register"
  JOIN_TEAM_PATH = "/actions/jointeam"

  Rack::Attack.cache.store = Rails.cache

  class << self
    def json_body_param(req, root, key)
      return nil unless req.content_type&.include?("application/json")

      body = req.body.read
      req.body.rewind
      JSON.parse(body).dig(root, key)
    rescue JSON::ParserError, TypeError
      nil
    end
  end

  throttle("login/ip", limit: 20, period: 1.minute) do |req|
    req.ip if req.post? && req.path == LOGIN_PATH
  end

  throttle("login/email", limit: 5, period: 5.minutes) do |req|
    if req.post? && req.path == LOGIN_PATH
      json_body_param(req, "user", "email")&.to_s&.downcase&.presence
    end
  end

  throttle("register/ip", limit: 3, period: 1.minute) do |req|
    req.ip if req.post? && req.path == REGISTER_PATH
  end

  throttle("jointeam/ip", limit: 20, period: 1.minute) do |req|
    req.ip if req.post? && req.path == JOIN_TEAM_PATH
  end

  throttle("jointeam/code", limit: 5, period: 5.minutes) do |req|
    if req.post? && req.path == JOIN_TEAM_PATH
      json_body_param(req, "team", "code")&.to_s&.presence
    end
  end

  throttle("chat/gifs", limit: 30, period: 1.minute) do |req|
    (req.get_header("HTTP_AUTHORIZATION").presence || req.ip) if req.get? && req.path.match?(%r{\A/teams/[^/]+/chat_channels/\d+/gifs\z})
  end

  self.throttled_responder = lambda do |_request|
    [ 429, { "Content-Type" => "application/json" }, [ { code: ErrorCodes::Common::RATE_LIMITED }.to_json ] ]
  end
end
