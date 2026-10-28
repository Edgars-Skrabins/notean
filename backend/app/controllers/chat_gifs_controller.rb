class ChatGifsController < ApplicationController
  include ChatScoped
  include FeatureGated

  QUERY_MAX_LENGTH = 50

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:chat) }
  before_action :set_chat_channel

  def index
    query = params[:q].to_s.strip.first(QUERY_MAX_LENGTH)
    return render json: { gifs: [], has_more: false } if query.empty?

    render json: GiphyClient.search(query, rating: @chat_channel.gif_rating, offset: [ params[:offset].to_i, 0 ].max)
  rescue GiphyClient::Unavailable
    render_error(ErrorCodes::Chat::GIFS_UNAVAILABLE, :service_unavailable)
  end
end
