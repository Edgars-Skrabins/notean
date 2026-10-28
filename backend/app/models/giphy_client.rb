require "net/http"

class GiphyClient
  BASE_URL = "https://api.giphy.com/v1/gifs".freeze
  SEARCH_LIMIT = 24
  TIMEOUT_SECONDS = 5

  class Unavailable < StandardError; end
  class NotFound < StandardError; end

  def self.api_key
    Rails.application.credentials.dig(:giphy, :api_key)
  end

  def self.search(query, rating:, offset: 0)
    data = request("/search", q: query, limit: SEARCH_LIMIT, offset: offset, rating: rating)
    pagination = data["pagination"] || {}
    gifs = Array(data["data"]).filter_map { |gif| gif_json(gif) }
    has_more = pagination["total_count"].to_i > pagination["offset"].to_i + pagination["count"].to_i

    { gifs: gifs, has_more: has_more }
  end

  def self.find(id, rating:)
    return nil unless id.to_s.match?(/\A[A-Za-z0-9]+\z/)

    gif = request("/#{id}", {})["data"]
    return nil if gif.blank? || !rating_allowed?(gif["rating"], rating)

    gif_json(gif)
  rescue NotFound
    nil
  end

  def self.request(path, query)
    key = api_key
    raise Unavailable if key.blank?

    uri = URI("#{BASE_URL}#{path}")
    uri.query = URI.encode_www_form(query.merge(api_key: key))
    response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: TIMEOUT_SECONDS, read_timeout: TIMEOUT_SECONDS) { |http| http.get(uri.request_uri) }

    raise NotFound if response.is_a?(Net::HTTPNotFound)
    raise Unavailable unless response.is_a?(Net::HTTPSuccess)

    JSON.parse(response.body)
  rescue JSON::ParserError, SocketError, SystemCallError, Net::OpenTimeout, Net::ReadTimeout, OpenSSL::SSL::SSLError
    raise Unavailable
  end

  def self.gif_json(gif)
    image = gif.dig("images", "fixed_height")
    return nil if image.blank? || !image["url"].to_s.match?(%r{\Ahttps://media\d*\.giphy\.com/})

    { id: gif["id"], url: image["url"], width: image["width"].to_i, height: image["height"].to_i, title: gif["title"].to_s }
  end

  def self.rating_allowed?(gif_rating, rating)
    allowed = rating == "pg-13" ? %w[g pg pg-13] : %w[g pg]
    allowed.include?(gif_rating.to_s)
  end

  private_class_method :request, :gif_json, :rating_allowed?
end
