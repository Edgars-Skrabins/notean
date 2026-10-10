class Rack::Attack
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
    req.ip if req.post? && req.path == "/auth/login"
  end

  throttle("login/email", limit: 5, period: 5.minutes) do |req|
    if req.post? && req.path == "/auth/login"
      json_body_param(req, "user", "email")&.to_s&.downcase&.presence
    end
  end

  throttle("register/ip", limit: 3, period: 1.minute) do |req|
    req.ip if req.post? && req.path == "/auth/register"
  end

  throttle("jointeam/ip", limit: 20, period: 1.minute) do |req|
    req.ip if req.post? && req.path == "/actions/jointeam"
  end

  throttle("jointeam/code", limit: 5, period: 5.minutes) do |req|
    if req.post? && req.path == "/actions/jointeam"
      json_body_param(req, "team", "code")&.to_s&.presence
    end
  end

  self.throttled_responder = lambda do |_request|
    [429, { "Content-Type" => "application/json" }, [{ statusMessage: "Too many attempts. Please wait and try again." }.to_json]]
  end
end
