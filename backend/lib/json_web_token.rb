class JsonWebToken
  SECRET_KEY = Rails.application.credentials.secret_key_base
  ALGORITHM = "HS256"

  def self.encode(payload, exp = nil)
    payload = payload.merge(exp: exp.to_i) if exp
    JWT.encode(payload, SECRET_KEY, ALGORITHM)
  end

  def self.decode(token)
    decoded = JWT.decode(token, SECRET_KEY, true, algorithm: ALGORITHM)[0]
    ActiveSupport::HashWithIndifferentAccess.new(decoded)
  end
end
